// ============================================================
//  OPERACIONES SOBRE ONEDRIVE con las reglas de Aletheia:
//   - nunca borrar
//   - leer la ficha justo antes de guardar y AÑADIR solo lo nuevo
//   - si OneDrive cambió entre medias (eTag), volver a leer y fusionar
//   - registro de actividad: solo añadir líneas al final
// ============================================================
import {
  leerFichaBytes, escribirFichaBytes, fusionarHistorial, comprobarFicha,
  anexarRegistro, lineaRegistro, nombreRegistro, esNombreFicha,
  CARPETA_FOTOS_MOVIL, fechaES, horaSegES,
} from './logica.js';

const MAX_INTENTOS = 6;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export function crearOperaciones(graph, { ordenador, usuario }) {
  /** Localiza la ficha JSON dentro de la carpeta del expediente. */
  async function buscarFicha(driveId, carpetaId, numero) {
    const hijos = await graph.hijos(driveId, carpetaId);
    const exacta = hijos.find((h) => h.file && esNombreFicha(h.name, numero));
    return exacta || hijos.find((h) => h.file && esNombreFicha(h.name, null)) || null;
  }

  /** Lee la ficha recién bajada de OneDrive. */
  async function leerFicha(driveId, fichaId) {
    const item = await graph.item(driveId, fichaId);
    const { obj, estilo } = leerFichaBytes(await graph.bytes(item));
    comprobarFicha(obj);
    return { item, obj, estilo };
  }

  /**
   * Añade entradas al historial sin pisar nada.
   * Devuelve { añadidas, expNumero }: cuántas entradas se añadieron de verdad
   * (0 si ya estaban) y el EXP_NUMERO que tiene la ficha.
   */
  async function añadirAlHistorial(driveId, fichaId, entradas) {
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const { item, obj, estilo } = await leerFicha(driveId, fichaId);
      const { ficha, añadidas } = fusionarHistorial(obj, entradas);
      const expNumero = String(obj.valores.EXP_NUMERO ?? '').trim();
      if (añadidas === 0) return { añadidas: 0, expNumero };
      try {
        await graph.reemplazarSiNoCambio(driveId, item.id, item.eTag, escribirFichaBytes(ficha, estilo), 'application/json');
        return { añadidas, expNumero };
      } catch (e) {
        // 412 = alguien (el PC) cambió la ficha entre la lectura y el guardado → repetir
        if (e.estado === 412 || e.estado === 409) { await espera(500 * (i + 1)); continue; }
        throw e;
      }
    }
    throw new Error('La ficha cambia continuamente en OneDrive. Se reintentará más tarde.');
  }

  /** Añade líneas al final del registro de actividad (lo crea si no existe). */
  async function anotar(driveId, carpetaId, numero, acciones) {
    const ahora = new Date();
    const lineas = acciones.map(([accion, detalle]) =>
      lineaRegistro({ fecha: fechaES(ahora), hora: horaSegES(ahora), ordenador, usuario, accion, detalle }));
    const nombre = nombreRegistro(numero);
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const item = await graph.itemPorRuta(driveId, carpetaId, nombre);
      try {
        if (!item) {
          await graph.crearNuevo(driveId, carpetaId, nombre, anexarRegistro(null, lineas), 'text/plain');
        } else {
          const antes = await graph.bytes(item);
          await graph.reemplazarSiNoCambio(driveId, item.id, item.eTag, anexarRegistro(antes, lineas), 'text/plain');
        }
        return;
      } catch (e) {
        if (e.estado === 412 || e.estado === 409) { await espera(500 * (i + 1)); continue; }
        throw e;
      }
    }
    throw new Error('No se pudo escribir el registro de actividad.');
  }

  /** Sube una foto a Imagenes/Aportaciones sin sobrescribir nunca. Devuelve su ruta relativa. */
  async function subirFoto(driveId, carpetaId, nombre, blob) {
    let n = nombre;
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const rel = `${CARPETA_FOTOS_MOVIL}/${n}`;
      try {
        await graph.crearNuevo(driveId, carpetaId, rel, blob, blob.type || 'image/jpeg');
        return rel;
      } catch (e) {
        if (e.estado !== 409) throw e;
        // Ya existe: si es la misma foto (subida en un intento anterior) vale; si no, otro nombre.
        const ya = await graph.itemPorRuta(driveId, carpetaId, rel);
        if (ya && ya.size === blob.size) return rel;
        n = nombre.replace(/(\.\w+)$/, `_${i + 2}$1`);
      }
    }
    throw new Error('No se pudo subir la foto ' + nombre);
  }

  /**
   * Procesa una entrada pendiente por fases. Tras cada fase guarda el progreso
   * con `guardarProgreso`, para que un corte de conexión no repita ni pierda nada.
   */
  async function procesarPendiente(p, guardarProgreso) {
    if (!p.fichaId) {
      const f = await buscarFicha(p.driveId, p.carpetaId, p.numero);
      if (!f) throw new Error('No se encuentra la ficha JSON en la carpeta del expediente.');
      p.fichaId = f.id;
      await guardarProgreso(p);
    }
    for (const foto of p.fotos) {
      if (foto.ruta) continue;
      foto.ruta = await subirFoto(p.driveId, p.carpetaId, foto.nombre, foto.blob);
      foto.blob = null; // ya está en OneDrive: se quita del móvil
      await guardarProgreso(p);
    }
    if (p.fase !== 'registro') {
      const entrada = { ...p.entrada, FOTOS: p.fotos.map((f) => ({ ruta: f.ruta, pie: f.pie || '' })) };
      const r = await añadirAlHistorial(p.driveId, p.fichaId, [entrada]);
      p.añadida = r.añadidas;
      if (r.expNumero) p.expNumero = r.expNumero;
      p.fase = 'registro';
      await guardarProgreso(p);
    }
    const resumen = `${p.entrada.FECHA} ${p.entrada.HORA} · ${p.entrada.LUGAR || 'sin lugar'} · ${p.fotos.length} foto(s)`;
    const acciones = [];
    for (const f of p.fotos) acciones.push(['Foto añadida', f.ruta]);
    acciones.push(p.añadida ? ['Historial: entrada añadida', resumen] : ['Historial: entrada ya existente (no se duplica)', resumen]);
    await anotar(p.driveId, p.carpetaId, p.expNumero || p.numero, acciones);
  }

  return { buscarFicha, leerFicha, añadirAlHistorial, anotar, subirFoto, procesarPendiente };
}
