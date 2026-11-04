// ============================================================
//  PIEZAS DE PANTALLA y presentación de la ficha (solo lectura).
//  Los nombres, el orden y los enlaces a mapas salen de campos.js
//  (generado desde el campos.json del Generador de Fichas).
//  Todo el texto de la ficha se pinta como texto, nunca como HTML.
// ============================================================
import { CAMPOS } from './campos.js';
import { etiquetaCampo, enlaceMaps } from './logica.js';

/** h('div', {class:'x', onclick: fn}, 'texto', otroNodo) */
export function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ---------------------------------------------------------------- definición de campos
const seccion = (titulo) => CAMPOS.secciones.find((s) => s.titulo === titulo);
const todosLosCampos = CAMPOS.secciones.flatMap((s) => s.campos);
const campo = (etq) => todosLosCampos.find((c) => c.etiqueta === etq);
const CONOCIDOS = new Set(CAMPOS.conocidos);
const VISIBLES = new Set(todosLosCampos.map((c) => c.etiqueta));
const DEF_VEHICULOS = campo('DETALLE_VEHICULOS') || { campos: [] };
const DEF_PROPIEDADES = campo('PROPIEDADES') || { campos: [] };
const APARTE = new Set(['HISTORIAL', 'DETALLE_VEHICULOS', 'PROPIEDADES', 'PROPIEDADES_RESUMEN']);

/** Campos que pueden llevar fotos (para la pestaña Fotos) y su nombre legible. */
export const CLAVES_FOTOS = todosLosCampos.filter((c) => ['imagen', 'galeria', 'vehiculos', 'historial'].includes(c.tipo)).map((c) => c.etiqueta);
export const NOMBRES_CAMPOS = Object.fromEntries(todosLosCampos.map((c) => [c.etiqueta, c.texto]));

/**
 * Lo mínimo para guardar en el móvil: los campos que la app enseña y los
 * campos nuevos que no conoce. Se quedan fuera contrato, cliente, colaboración
 * e informe (RGPD: en el móvil solo lo necesario).
 */
export function minimizar(valores) {
  const out = {};
  for (const [k, v] of Object.entries(valores || {})) if (VISIBLES.has(k) || !CONOCIDOS.has(k)) out[k] = v;
  return out;
}

// ---------------------------------------------------------------- utilidades
const vacio = (v) => v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(vacio));
const texto = (v) => (v == null ? '' : String(v).trim());

/** Búsqueda para Google Maps: los campos de «consulta_mapa» (o el propio) + país. */
function consultaMapa(def, valores, valor) {
  const partes = def.consulta_mapa ? def.consulta_mapa.map((k) => texto(valores[k])) : [texto(valor)];
  const p = partes.filter(Boolean);
  if (CAMPOS.pais_mapa && !p.join(' ').toLowerCase().includes(CAMPOS.pais_mapa.toLowerCase())) p.push(CAMPOS.pais_mapa);
  return p.join(', ');
}
export const linkMapa = (consulta, txt = '📍 Mapa') =>
  h('a', { href: enlaceMaps(consulta), target: '_blank', rel: 'noopener noreferrer', class: 'mapa' }, txt);
export const lugarConMapa = (lugar) => (lugar ? h('span', {}, lugar, ' ', linkMapa(consultaMapa({}, {}, lugar))) : null);

function valorBonito(etq, v) {
  const s = texto(v);
  const k = (etq || '').toUpperCase();
  if (/TELEFONO|MOVIL/.test(k) && /\d{6,}/.test(s.replace(/\s/g, '')))
    return h('span', {}, ...s.split(/([+\d][\d\s.]{7,}\d)/).map((t, i) => (i % 2 ? h('a', { href: 'tel:' + t.replace(/[\s.]/g, '') }, t) : t)));
  if (/EMAIL/.test(k) && /^\S+@\S+$/.test(s)) return h('a', { href: 'mailto:' + s }, s);
  if (/^https?:\/\/\S+$/i.test(s)) return h('a', { href: s, target: '_blank', rel: 'noopener noreferrer' }, s);
  return s;
}

const fila = (etiqueta, ...valor) => h('div', { class: 'dato' }, h('div', { class: 'k' }, etiqueta), h('div', { class: 'v' }, ...valor));
const fotosDe = (v, pie) => (Array.isArray(v) ? v : [v]).filter(Boolean).map((f) => (typeof f === 'string' ? { ruta: f, pie } : f));

// ---------------------------------------------------------------- pestaña Datos
/**
 * @param valores  la ficha
 * @param pintarFotos  función (lista de {ruta, pie}) => nodo
 */
export function vistaDatos(valores, pintarFotos) {
  const tarjetas = [];
  for (const sec of CAMPOS.secciones) {
    if (['Vehículos', 'Historial'].includes(sec.titulo)) continue;
    const consumidos = new Set();
    // Una dirección con valor «se come» su población y provincia (salen en la misma fila)
    for (const c of sec.campos)
      if (c.consulta_mapa && !vacio(valores[c.etiqueta])) c.consulta_mapa.forEach((k) => k !== c.etiqueta && consumidos.add(k));

    const filas = [];
    let fotoCabecera = null;
    for (const c of sec.campos) {
      const v = valores[c.etiqueta];
      if (APARTE.has(c.etiqueta) || consumidos.has(c.etiqueta) || vacio(v)) continue;
      if (c.tipo === 'imagen' || c.tipo === 'galeria') {
        const pie = c.etiqueta === 'FOTO_ADICIONAL_1' ? texto(valores.TITULO_FOTO_1) : '';
        const nodo = pintarFotos(fotosDe(v, pie));
        if (c.etiqueta === 'FOTO_INVESTIGADO') fotoCabecera = nodo;
        else filas.push(fila(c.texto, nodo));
        continue;
      }
      if (c.tipo === 'casilla') {
        if (texto(v) !== 'Sí') continue;
        filas.push(fila(c.texto, c.texto_casilla ? `Sí · ${c.texto_casilla}` : 'Sí'));
        continue;
      }
      if (c.consulta_mapa || c.enlace_mapa) {
        const resto = (c.consulta_mapa || []).filter((k) => k !== c.etiqueta).map((k) => texto(valores[k])).filter(Boolean);
        const segunda = resto.length === 2 ? `${resto[0]} (${resto[1]})` : resto.join(', ');
        filas.push(fila(c.texto, texto(v), segunda ? h('div', { class: 'sub' }, segunda) : null, linkMapa(consultaMapa(c, valores, v))));
        continue;
      }
      filas.push(fila(c.texto, valorBonito(c.etiqueta, v)));
    }
    if (filas.length || fotoCabecera)
      tarjetas.push(h('section', { class: 'tarjeta' }, h('h3', {}, sec.titulo), fotoCabecera ? h('div', { class: 'foto-cabecera' }, fotoCabecera) : null, filas));
  }
  // Campos que el programa no conoce todavía (por si se añaden en el futuro)
  const otros = Object.entries(valores).filter(([k, v]) => !CONOCIDOS.has(k) && !APARTE.has(k) && !vacio(v) && typeof v !== 'object');
  if (otros.length) tarjetas.push(h('section', { class: 'tarjeta' }, h('h3', {}, 'Otros datos'), otros.map(([k, v]) => fila(etiquetaCampo(k), valorBonito(k, v)))));
  return tarjetas.length ? tarjetas : h('p', { class: 'vacio' }, 'La ficha no tiene datos.');
}

// ---------------------------------------------------------------- listas (vehículos, fincas)
function filasLista(item, def, ocultar = []) {
  const out = [];
  const usadas = new Set(['FOTOS', ...ocultar]);
  for (const c of def.campos || []) {
    const k = c.clave || c.etiqueta;
    if (usadas.has(k)) continue;
    usadas.add(k);
    const v = item[k];
    if (vacio(v)) continue;
    out.push(fila(c.texto, c.enlace_mapa ? h('span', {}, texto(v), ' ', linkMapa(consultaMapa({}, {}, v))) : valorBonito(k, v)));
  }
  for (const [k, v] of Object.entries(item)) if (!usadas.has(k) && !vacio(v) && typeof v !== 'object') out.push(fila(etiquetaCampo(k), valorBonito(k, v)));
  return out;
}

export function vistaVehiculos(valores, pintarFotos) {
  const lista = Array.isArray(valores.DETALLE_VEHICULOS) ? valores.DETALLE_VEHICULOS : [];
  if (!lista.length) return h('p', { class: 'vacio' }, 'No hay vehículos en la ficha.');
  return lista.map((veh) => h('section', { class: 'tarjeta' },
    h('h3', {}, veh.MATRICULA ? h('span', { class: 'matricula' }, veh.MATRICULA) : 'Sin matrícula'),
    h('p', { class: 'titulo-item' }, [veh.MARCA, veh.MODELO].filter(Boolean).join(' '), veh.COLOR ? h('span', { class: 'sub' }, ' · ' + veh.COLOR) : null),
    filasLista(veh, DEF_VEHICULOS, ['MATRICULA', 'MARCA', 'MODELO', 'COLOR']),
    Array.isArray(veh.FOTOS) && veh.FOTOS.length ? pintarFotos(fotosDe(veh.FOTOS)) : null));
}

export function vistaPropiedades(valores, pintarFotos) {
  const out = [];
  if (!vacio(valores.PROPIEDADES_RESUMEN))
    out.push(h('section', { class: 'tarjeta' }, h('h3', {}, campo('PROPIEDADES_RESUMEN')?.texto || 'Resumen'), h('div', { class: 'v' }, texto(valores.PROPIEDADES_RESUMEN))));
  const lista = Array.isArray(valores.PROPIEDADES) ? valores.PROPIEDADES : [];
  const claves = DEF_PROPIEDADES.claves_titulo || [];
  lista.forEach((p, i) => {
    if (!p || typeof p !== 'object') { out.push(h('section', { class: 'tarjeta' }, String(p))); return; }
    const titulo = claves.map((k) => texto(p[k])).filter(Boolean).join(' · ');
    out.push(h('section', { class: 'tarjeta' },
      h('h3', {}, `Finca ${i + 1}`, titulo ? h('span', { class: 'sub' }, ' · ' + titulo) : null),
      filasLista(p, DEF_PROPIEDADES),
      Array.isArray(p.FOTOS) && p.FOTOS.length ? pintarFotos(fotosDe(p.FOTOS)) : null));
  });
  return out.length ? out : h('p', { class: 'vacio' }, 'No hay propiedades en la ficha.');
}
