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
const SUFIJOS_DIRECCION = ['_TIPO', '_DE', '_NOTAS'];
export function vistaDatos(valores, pintarFotos, abrirPdf) {
  const tarjetas = [];
  const usadosAparte = new Set(); // datos que ya salen junto a otro (tipo y notas de una dirección)
  const ctx = { pintarFotos, abrirPdf };
  // Lo primero: la tarjeta de identificación (lo que se mira en plena vigilancia)
  const identificacion = tarjetaIdentificacion(valores, pintarFotos);
  if (identificacion) tarjetas.push(identificacion);
  for (const sec of CAMPOS.secciones) {
    if (['Vehículos', 'Historial'].includes(sec.titulo)) continue;
    const consumidos = new Set();
    // Una dirección con valor «se come» su población y provincia (salen en la misma fila)
    for (const c of sec.campos)
      if (c.consulta_mapa && !vacio(valores[c.etiqueta])) c.consulta_mapa.forEach((k) => k !== c.etiqueta && consumidos.add(k));
    for (const c of sec.campos) for (const suf of SUFIJOS_DIRECCION) { usadosAparte.add(c.etiqueta + suf); if (c.consulta_mapa) consumidos.add(c.etiqueta + suf); }

    const filas = [];
    let fotoCabecera = null;
    for (const c of sec.campos) {
      const v = valores[c.etiqueta];
      if (APARTE.has(c.etiqueta) || consumidos.has(c.etiqueta) || vacio(v)) continue;
      if (c.tipo === 'imagen' || c.tipo === 'galeria') {
        const pie = c.etiqueta === 'FOTO_ADICIONAL_1' ? texto(valores.TITULO_FOTO_1) : '';
        const nodo = pintarFotos(fotosDe(v, pie));
        if (c.etiqueta === 'FOTO_INVESTIGADO') { if (!identificacion) fotoCabecera = nodo; }
        else filas.push(fila(c.texto, nodo));
        continue;
      }
      // Listas (familiares, otros hijos, otros trabajos…): una tarjetita por elemento, con sus fotos
      if (Array.isArray(v)) {
        if (v.some((x) => x && typeof x === 'object')) filas.push(h('div', { class: 'sublista' }, h('div', { class: 'k' }, c.texto), v.filter((x) => x && typeof x === 'object' && !vacio(x)).map((x) => subtarjeta(x, c, ctx))));
        else filas.push(fila(c.texto, v.map(texto).filter(Boolean).join('\n')));
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
        // Tipo, «de quién» y notas de la dirección (datos del programa 7.x), debajo de la dirección
        const de = textoPersona(valores[c.etiqueta + '_DE']);
        const extra = [texto(valores[c.etiqueta + '_TIPO']), de ? 'De: ' + de : ''].filter(Boolean).join(' · ');
        const notas = texto(valores[c.etiqueta + '_NOTAS']);
        filas.push(fila(c.texto, texto(v), segunda ? h('div', { class: 'sub' }, segunda) : null, linkMapa(consultaMapa(c, valores, v)),
          extra ? h('div', { class: 'sub' }, extra) : null, notas ? h('div', { class: 'sub' }, notas) : null));
        continue;
      }
      filas.push(fila(c.texto, valorBonito(c.etiqueta, v)));
    }
    if (filas.length || fotoCabecera)
      tarjetas.push(h('section', { class: 'tarjeta' }, h('h3', {}, sec.titulo), fotoCabecera ? h('div', { class: 'foto-cabecera' }, fotoCabecera) : null, filas));
    // Los vehículos también en la ficha (resumidos, con sus fotos), como en la ficha del PC
    if (sec.titulo === 'Trabajo' || (sec === CAMPOS.secciones.at(-1))) vehiculosEnFicha();
  }
  function vehiculosEnFicha() {
    if (vehiculosEnFicha.hecho) return; vehiculosEnFicha.hecho = true;
    const lista = (Array.isArray(valores.DETALLE_VEHICULOS) ? valores.DETALLE_VEHICULOS : []).filter((x) => x && !vacio(x));
    if (!lista.length) return;
    tarjetas.push(h('section', { class: 'tarjeta' }, h('h3', {}, 'Vehículos'),
      lista.map((veh) => h('div', { class: 'subtarjeta' },
        h('div', { class: 'titulo-item' }, veh.MATRICULA ? h('span', { class: 'matricula' }, veh.MATRICULA) : null, ' ', [veh.MARCA, veh.MODELO].map(texto).filter(Boolean).join(' '), veh.COLOR ? h('span', { class: 'sub' }, ' · ' + veh.COLOR) : null),
        Array.isArray(veh.FOTOS) && veh.FOTOS.length ? pintarFotos(fotosDe(veh.FOTOS)) : null)),
      h('p', { class: 'sub' }, 'Todos los datos de cada vehículo, en la pestaña Vehículos.')));
  }
  // Campos que la app aún no conoce (el programa del PC añade datos nuevos): se enseñan igualmente
  const otros = Object.entries(valores).filter(([k, v]) => !CONOCIDOS.has(k) && !APARTE.has(k) && !usadosAparte.has(k) && !k.startsWith('_') && !k.includes('__') && !vacio(v));
  const sueltos = otros.filter(([, v]) => typeof v !== 'object');
  const listas = otros.filter(([, v]) => Array.isArray(v));
  for (const [k, v] of listas) {
    const objs = v.filter((x) => x && typeof x === 'object' && !vacio(x));
    if (objs.length) tarjetas.push(h('section', { class: 'tarjeta' }, h('h3', {}, etiquetaCampo(k)), objs.map((x) => subtarjeta(x, { campos: [] }, ctx))));
    else sueltos.push([k, v.map(texto).filter(Boolean).join('\n')]);
  }
  if (sueltos.length) tarjetas.push(h('section', { class: 'tarjeta' }, h('h3', {}, 'Otros datos'), sueltos.map(([k, v]) => fila(etiquetaCampo(k), valorConMapa(k, v)))));
  return tarjetas.length ? tarjetas : h('p', { class: 'vacio' }, 'La ficha no tiene datos.');
}

/** «¿De quién?» puede ser un nombre o una persona de la lista de familiares */
function textoPersona(v) {
  if (!v) return '';
  if (typeof v === 'object') return [tituloItem(v), texto(v.RELACION)].filter(Boolean).join(' · ');
  return texto(v);
}

/** Tarjeta de identificación: foto, nombre, edad, físico, domicilio habitual, matrículas y trabajo. */
function tarjetaIdentificacion(v, pintarFotos) {
  const nombre = [v.NOMBRE, v.APELLIDOS].map(texto).filter(Boolean).join(' ');
  const edad = texto(v.EDAD) ? `${texto(v.EDAD)} años` : '';
  const fisico = [['Estatura', v.ESTATURA], ['Peso', v.PESO], ['Pelo', v.COLOR_PELO], ['Complexión', v.MORFOLOGIA]]
    .filter(([, x]) => texto(x)).map(([k, x]) => `${k}: ${texto(x)}`);
  // Domicilio habitual (por su tipo) o, si no se ha marcado, el primero
  let dom = null;
  for (let i = 1; i <= 4; i++) if (texto(v[`DIRECCION_${i}`]) && /habitual/i.test(texto(v[`DIRECCION_${i}_TIPO`]))) { dom = i; break; }
  if (!dom && texto(v.DIRECCION_1)) dom = 1;
  const def = campo(`DIRECCION_${dom}`) || {};
  const domTxt = dom ? [texto(v[`DIRECCION_${dom}`]), texto(v[`POBLACION_${dom}`])].filter(Boolean).join(', ') : '';
  const mats = (Array.isArray(v.DETALLE_VEHICULOS) ? v.DETALLE_VEHICULOS : []).filter((x) => texto(x?.MATRICULA));
  const trabajos = (Array.isArray(v.OTROS_TRABAJOS) ? v.OTROS_TRABAJOS : []).filter((x) => x && (texto(x.EMPRESA) || texto(x.HORARIO)))
    .map((x) => [texto(x.EMPRESA), texto(x.CARGO), texto(x.HORARIO)].filter(Boolean).join(' · '));
  if (!trabajos.length && texto(v.TRABAJO_EMPRESA)) trabajos.push(texto(v.TRABAJO_EMPRESA));
  if (!nombre && !texto(v.FOTO_INVESTIGADO) && !fisico.length && !domTxt && !mats.length) return null;
  return h('section', { class: 'tarjeta identificacion' },
    h('h3', {}, 'Identificación'),
    h('div', { class: 'ident-cuerpo' },
      texto(v.FOTO_INVESTIGADO) ? h('div', { class: 'ident-foto' }, pintarFotos(fotosDe(v.FOTO_INVESTIGADO))) : null,
      h('div', { class: 'ident-datos' },
        nombre ? h('div', { class: 'ident-nombre' }, nombre) : null,
        edad ? h('div', {}, edad) : null,
        fisico.length ? h('div', { class: 'sub' }, fisico.join(' · ')) : null)),
    domTxt ? h('div', { class: 'ident-linea' }, '🏠 ', domTxt, ' ', linkMapa(consultaMapa(def, v, v[`DIRECCION_${dom}`]))) : null,
    mats.length ? h('div', { class: 'ident-linea' }, '🚗 ', mats.map((x) => h('span', { class: 'matricula' }, texto(x.MATRICULA))), ' ',
      h('span', { class: 'sub' }, mats.map((x) => [x.MARCA, x.MODELO, x.COLOR].map(texto).filter(Boolean).join(' ')).join(' · '))) : null,
    trabajos.length ? h('div', { class: 'ident-linea' }, '💼 ', trabajos.join(' | ')) : null);
}

/** Título de un elemento de una lista: nombre y apellidos, empresa, marca y modelo… */
function tituloItem(x) {
  const nombre = [x.NOMBRE, x.APELLIDOS].map(texto).filter(Boolean).join(' ');
  return nombre || texto(x.EMPRESA) || [x.MARCA, x.MODELO, x.MATRICULA].map(texto).filter(Boolean).join(' ') || texto(x.RED || x.TIPO || x.NOMBRE_RED || x.USUARIO) || '';
}
const subtituloItem = (x) => [x.RELACION, x.PARENTESCO, x.CARGO, x.EDAD ? `${texto(x.EDAD)} años` : ''].map(texto).filter(Boolean).join(' · ');

function subtarjeta(x, def, ctx) {
  const t = tituloItem(x), st = subtituloItem(x);
  const ocultar = ['NOMBRE', 'APELLIDOS', 'RELACION', 'PARENTESCO', 'EDAD', ...(t && x.EMPRESA && !x.NOMBRE ? ['EMPRESA', 'CARGO'] : [])];
  return h('div', { class: 'subtarjeta' },
    t || st ? h('div', { class: 'titulo-item' }, t, st ? h('span', { class: 'sub' }, (t ? ' · ' : '') + st) : null) : null,
    filasLista(x, def, ocultar, ctx),
    Array.isArray(x.FOTOS) && x.FOTOS.length ? ctx.pintarFotos(fotosDe(x.FOTOS)) : null);
}

const ES_LUGAR = /DIRECCI|DOMICILIO|UBICACI|LUGAR/;
const valorConMapa = (k, v) => (ES_LUGAR.test(String(k).toUpperCase()) && !/_(TIPO|DE|NOTAS)$/i.test(String(k)) && texto(v).length > 3 && !/^[a-z]:\\/i.test(texto(v))
  ? h('span', {}, texto(v), ' ', linkMapa(consultaMapa({}, {}, v))) : valorBonito(k, v));

// ---------------------------------------------------------------- listas (vehículos, fincas)
function filasLista(item, def, ocultar = [], ctx = {}) {
  const out = [];
  const usadas = new Set(['FOTOS', ...ocultar]);
  // Un PDF guardado en el PC (p. ej. el informe de la DGT): botón para abrirlo desde OneDrive
  for (const [k, v] of Object.entries(item)) {
    if (typeof v === 'string' && /\.pdf$/i.test(v.trim()) && ctx.abrirPdf) {
      usadas.add(k);
      out.push(fila(/DGT/i.test(k) ? 'Informe DGT (PDF)' : etiquetaCampo(k), h('button', { class: 'boton sec', type: 'button', onclick: () => ctx.abrirPdf(v.trim()) }, '📄 Abrir PDF')));
    }
  }
  for (const c of def.campos || []) {
    const k = c.clave || c.etiqueta;
    if (usadas.has(k)) continue;
    usadas.add(k);
    const v = item[k];
    if (vacio(v)) continue;
    out.push(fila(c.texto, c.enlace_mapa ? h('span', {}, texto(v), ' ', linkMapa(consultaMapa({}, {}, v))) : valorBonito(k, v)));
  }
  for (const [k, v] of Object.entries(item)) if (!usadas.has(k) && !k.includes('__') && !vacio(v) && typeof v !== 'object' && !/\.pdf$/i.test(String(v))) out.push(fila(etiquetaCampo(k), valorConMapa(k, v)));
  return out;
}

export function vistaVehiculos(valores, pintarFotos, abrirPdf) {
  const lista = Array.isArray(valores.DETALLE_VEHICULOS) ? valores.DETALLE_VEHICULOS : [];
  if (!lista.length) return h('p', { class: 'vacio' }, 'No hay vehículos en la ficha.');
  return lista.map((veh) => {
    const resto = filasLista(veh, DEF_VEHICULOS, ['MATRICULA', 'MARCA', 'MODELO', 'COLOR'], { abrirPdf });
    return h('section', { class: 'tarjeta' },
      h('h3', {}, veh.MATRICULA ? h('span', { class: 'matricula' }, veh.MATRICULA) : 'Sin matrícula'),
      h('p', { class: 'titulo-item' }, [veh.MARCA, veh.MODELO].filter(Boolean).join(' '), veh.COLOR ? h('span', { class: 'sub' }, ' · ' + veh.COLOR) : null),
      Array.isArray(veh.FOTOS) && veh.FOTOS.length ? pintarFotos(fotosDe(veh.FOTOS)) : null,
      // Titular, DGT, ITV, seguro…: solo si se pide (para no saturar)
      resto.length ? h('details', { class: 'mas-datos' }, h('summary', {}, `Ver todos los datos (${resto.length})`), resto) : null);
  });
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
      filasLista(p, DEF_PROPIEDADES, [], {}),
      Array.isArray(p.FOTOS) && p.FOTOS.length ? pintarFotos(fotosDe(p.FOTOS)) : null));
  });
  return out.length ? out : h('p', { class: 'vacio' }, 'No hay propiedades en la ficha.');
}
