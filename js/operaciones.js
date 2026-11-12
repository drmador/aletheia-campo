// ============================================================
//  OPERACIONES SOBRE ONEDRIVE con las reglas de Aletheia:
//   - nunca borrar
//   - leer la ficha justo antes de guardar y AÑADIR solo lo nuevo
//   - si OneDrive cambió entre medias (eTag), volver a leer y fusionar
//   - registro de actividad: solo añadir líneas al final
// ============================================================
import {
  leerFichaBytes, añadirAlHistorialBytes, comprobarFicha, yaEsta, estaDescartada,
  anexarRegistro, lineaRegistro, nombreRegistro, esNombreFicha,
  CARPETA_FOTOS_MOVIL, CARPETA_AUDIOS, nombreAlternativoAudio, fechaES, horaSegES, rutaRelativaLimpia,
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
   * Añade entradas al historial sin pisar nada: no reescribe la ficha, solo
   * inserta las entradas nuevas en el texto original (ver añadirAlHistorialBytes).
   * Devuelve { añadidas, expNumero }: cuántas entradas se añadieron de verdad
   * (0 si ya estaban) y el EXP_NUMERO que tiene la ficha.
   */
  async function añadirAlHistorial(driveId, fichaId, entradas) {
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const item = await graph.item(driveId, fichaId);
      const original = await graph.bytes(item);
      const { obj } = leerFichaBytes(original);
      comprobarFicha(obj);
      const { bytes, añadidas, descartadas } = añadirAlHistorialBytes(original, entradas);
      const expNumero = String(obj.valores.EXP_NUMERO ?? '').trim();
      if (añadidas === 0) return { añadidas: 0, descartadas, expNumero };
      try {
        await graph.reemplazarSiNoCambio(driveId, item.id, item.eTag, bytes, 'application/json');
        // Confirmar: volver a leer la ficha de OneDrive y comprobar que la entrada está dentro
        const { obj: releida } = await leerFicha(driveId, fichaId);
        for (const e of entradas)
          if (!yaEsta(e, releida.valores.HISTORIAL) && !estaDescartada(e, releida.valores._DESCARTADAS))
            throw new Error('OneDrive no confirma la entrada en la ficha. Sigue pendiente y se reintentará.');
        return { añadidas, descartadas, expNumero };
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

  /**
   * Sube un archivo NUEVO a `carpeta` sin sobrescribir nunca. Si el nombre ya existe,
   * prueba con `alternativo(nombre, 2)`, `(…, 3)`… Devuelve su ruta relativa.
   */
  async function subirArchivo(driveId, carpetaId, carpeta, nombre, blob, tipo, alternativo) {
    let n = nombre;
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const rel = `${carpeta}/${n}`;
      let creado;
      try {
        creado = await graph.crearNuevo(driveId, carpetaId, rel, blob, tipo);
      } catch (e) {
        if (e.estado !== 409) throw e;
        // Ya existe: si es el mismo archivo (subido en un intento anterior que se cortó) vale; si no, otro nombre.
        const ya = await graph.itemPorRuta(driveId, carpetaId, rel);
        if (ya && ya.size === blob.size) return rel;
        n = alternativo(nombre, i + 2);
        continue;
      }
      // Comprobar que en OneDrive está entero (mismo tamaño) ANTES de soltar la copia del móvil
      const tam = typeof creado?.size === 'number' ? creado.size : (await graph.itemPorRuta(driveId, carpetaId, rel))?.size;
      if (tam !== blob.size)
        throw new Error(`${nombre}: en OneDrive no ha quedado completo (${tam ?? 0} de ${blob.size} bytes). La copia sigue en el móvil y se reintentará.`);
      return rel;
    }
    throw new Error('No se pudo subir ' + nombre);
  }

  /**
   * Localiza en OneDrive el audio de una nota de voz.
   * 1.º en la ruta exacta de AUDIO; 2.º en la carpeta Audios con el mismo nombre (sin
   * distinguir mayúsculas ni extensión); 3.º buscando el nombre en todo el expediente
   * (por si se movió o se renombró). Devuelve { item, ruta } o null si no está.
   */
  async function buscarAudio(driveId, carpetaId, ruta) {
    const rel = rutaRelativaLimpia(ruta);
    const nombre = rel.split('/').pop();
    const base = nombre.replace(/\.\w{2,5}$/, '');
    const norm = (s) => (s || '').normalize('NFC').toLowerCase();
    const esAudio = (it) => it?.file && /\.(m4a|mp4|aac|webm|ogg|opus|mp3|wav|flac|3gp|amr)$/i.test(it.name || '');
    const exacta = await graph.itemPorRuta(driveId, carpetaId, rel);
    if (exacta?.file) return { item: exacta, ruta: rel };
    const elegir = (lista) =>
      lista.find((it) => esAudio(it) && norm(it.name) === norm(nombre)) ||
      lista.find((it) => esAudio(it) && norm(it.name).replace(/\.\w{2,5}$/, '') === norm(base));
    const carpetaAudios = await graph.itemPorRuta(driveId, carpetaId, rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : CARPETA_AUDIOS);
    if (carpetaAudios?.folder) {
      const it = elegir(await graph.hijos(driveId, carpetaAudios.id));
      if (it) return { item: it, ruta: `${rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : CARPETA_AUDIOS}/${it.name}` };
    }
    try {
      const it = elegir(await graph.buscar(driveId, carpetaId, base));
      if (it) return { item: it, ruta: it.name };
    } catch { /* la búsqueda es solo una ayuda */ }
    return null;
  }

  /** Sube una foto a Imagenes/Aportaciones sin sobrescribir nunca. Devuelve su ruta relativa. */
  const subirFoto = (driveId, carpetaId, nombre, blob) =>
    subirArchivo(driveId, carpetaId, CARPETA_FOTOS_MOVIL, nombre, blob, blob.type || 'image/jpeg',
      (n, k) => n.replace(/(\.\w+)$/, `_${k}$1`));

  /** Sube una nota de voz a Audios sin sobrescribir nunca ("Nota … (2).m4a"). */
  const subirAudio = (driveId, carpetaId, nombre, blob) =>
    subirArchivo(driveId, carpetaId, CARPETA_AUDIOS, nombre, blob, (blob.type || 'audio/mp4').split(';')[0], nombreAlternativoAudio);

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
    // 0.º leer la ficha de OneDrive: si la entrada ya está (aunque el PC la haya corregido) o el PC la
    //     descartó, no se sube nada más (lo del PC manda)
    if (p.fase !== 'registro' && !(p.audio && !p.audio.ruta)) { // (una nota cuyo audio no ha subido no puede estar ya)
      const { obj } = await leerFicha(p.driveId, p.fichaId);
      const borrador = { ...p.entrada, FOTOS: p.fotos.filter((f) => f.ruta).map((f) => ({ ruta: f.ruta })), ...(p.audio?.ruta ? { AUDIO: p.audio.ruta } : {}) };
      if (estaDescartada(borrador, obj.valores._DESCARTADAS)) { p.descartada = true; p.añadida = 0; p.fase = 'registro'; await guardarProgreso(p); }
      else if (yaEsta(borrador, obj.valores.HISTORIAL)) { p.añadida = 0; p.fase = 'registro'; await guardarProgreso(p); }
      if (obj.valores.EXP_NUMERO) p.expNumero = String(obj.valores.EXP_NUMERO).trim();
    }
    // 1.º el audio (para que el PC encuentre el archivo cuando vea la entrada)
    if (p.fase !== 'registro' && p.audio && !p.audio.ruta) {
      p.audio.ruta = await subirAudio(p.driveId, p.carpetaId, p.audio.nombre, p.audio.blob);
      p.audio.blob = null; // ya está en OneDrive: se quita del móvil
      await guardarProgreso(p);
    }
    // 2.º las fotos
    for (const foto of p.fotos) {
      if (foto.ruta || p.fase === 'registro') continue;
      foto.ruta = await subirFoto(p.driveId, p.carpetaId, foto.nombre, foto.blob);
      foto.blob = null; // ya está en OneDrive: se quita del móvil
      await guardarProgreso(p);
    }
    if (p.fase !== 'registro') {
      // 3.º la entrada en la ficha
      const entrada = { ...p.entrada, FOTOS: p.fotos.map((f) => ({ ruta: f.ruta, pie: f.pie || '' })) };
      if (p.audio) Object.assign(entrada, { AUDIO: p.audio.ruta, AUDIO_DURACION: p.audio.duracion });
      const r = await añadirAlHistorial(p.driveId, p.fichaId, [entrada]);
      p.añadida = r.añadidas;
      if (!r.añadidas && r.descartadas) p.descartada = true;
      if (r.expNumero) p.expNumero = r.expNumero;
      p.fase = 'registro';
      await guardarProgreso(p);
    }
    const resumen = `${p.entrada.FECHA} ${p.entrada.HORA} · ${p.entrada.LUGAR || (p.entrada.GPS ? 'GPS ' + p.entrada.GPS : 'sin lugar')} · ${p.fotos.length} foto(s)`;
    const acciones = [];
    for (const f of p.fotos) if (f.ruta) acciones.push(['Foto añadida', f.ruta]);
    if (p.descartada) {
      acciones.length = 0;
      acciones.push(['Historial: entrada no subida (descartada en el PC)', resumen]);
    } else if (p.audio) {
      const archivo = p.audio.ruta.split('/').pop();
      acciones.push(p.añadida ? ['Nota de voz grabada', archivo] : ['Nota de voz ya existente (no se duplica)', archivo]);
    } else {
      acciones.push(p.añadida ? ['Historial: entrada añadida', resumen] : ['Historial: entrada ya existente (no se duplica)', resumen]);
    }
    await anotar(p.driveId, p.carpetaId, p.expNumero || p.numero, acciones);
  }

  return { buscarFicha, leerFicha, añadirAlHistorial, anotar, subirFoto, subirAudio, buscarAudio, procesarPendiente };
}
