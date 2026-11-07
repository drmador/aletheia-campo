// ============================================================
//  LÓGICA PURA (sin red ni pantalla). Es la parte que protege
//  los datos del PC, por eso tiene pruebas propias en /pruebas.
// ============================================================

export const PROGRAMA = 'Generador de Fichas';
export const RE_EXPEDIENTE = /^(\d+)\s*-\s*(EDP\d+)/i;
export const CARPETA_FOTOS_MOVIL = 'Imagenes/Aportaciones';

const nfc = (s) => (s ?? '').toString().normalize('NFC');

// "0440 - EDP0150 - Ana Ejemplo" -> {numero:'0440', edp:'EDP0150', investigado:'Ana Ejemplo'}
export function leerNombreCarpeta(nombre) {
  const n = nfc(nombre);
  const m = n.match(RE_EXPEDIENTE);
  if (!m) return null;
  const resto = n.slice(m[0].length).replace(/^\s*-\s*/, '').trim();
  return { numero: m[1], edp: m[2].toUpperCase(), investigado: resto };
}

export const numero4 = (num) => String(num).replace(/\D/g, '').padStart(4, '0');
export const nombreFicha = (num) => `Información ${numero4(num)}.json`;
// Igual que el PC: «Registro de actividad {EXP_NUMERO}.txt», con el número tal cual (0440, 99999…)
export const nombreRegistro = (num) => {
  const s = String(num ?? '').trim();
  return `Registro de actividad ${/^\d{4,}$/.test(s) ? s : numero4(s)}.txt`;
};

// ¿Este nombre de archivo es la ficha? (acepta "ó" escrita de cualquier forma)
export function esNombreFicha(nombre, num) {
  const n = nfc(nombre).toLowerCase();
  const re = /^informaci[oó]n\s+(\d+)\.json$/;
  const m = n.match(re);
  if (!m) return false;
  return num == null || numero4(m[1]) === numero4(num);
}

// ---------- Ficha ----------
export function comprobarFicha(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('La ficha no es un JSON válido.');
  if (obj.programa !== PROGRAMA)
    throw new Error(`Este JSON no es una ficha del «${PROGRAMA}». No se toca.`);
  if (!obj.valores || typeof obj.valores !== 'object')
    throw new Error('La ficha no tiene el apartado «valores». No se toca.');
  return obj;
}

const limpiaTexto = (t) => nfc(t).replace(/\r\n?/g, '\n').trim();

// Dos entradas son «la misma» si coinciden fecha, hora y texto.
export function claveEntrada(e) {
  return [limpiaTexto(e?.FECHA), limpiaTexto(e?.HORA), limpiaTexto(e?.TEXTO)].join('\u0001');
}

// ---------- Coordenadas GPS: "42.240612, -8.720700" (6 decimales, punto decimal) ----------
export const formatoGPS = (lat, lon) => `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
export const esGPS = (s) => /^-?\d{1,2}\.\d{6}, -?\d{1,3}\.\d{6}$/.test(s || '');

// Devuelve una entrada con el formato exacto del programa de Windows.
// GPS solo se escribe si hay coordenadas válidas (las entradas sin GPS quedan como siempre).
export function normalizarEntrada(e) {
  const out = {
    FECHA: limpiaTexto(e.FECHA),
    HORA: limpiaTexto(e.HORA),
    LUGAR: limpiaTexto(e.LUGAR),
  };
  if (esGPS(limpiaTexto(e.GPS))) out.GPS = limpiaTexto(e.GPS);
  out.TEXTO = limpiaTexto(e.TEXTO);
  out.FOTOS = (e.FOTOS || []).map((f) => ({ ruta: f.ruta, pie: f.pie || '' }));
  return out;
}

/**
 * Añade al historial de `ficha` (la copia RECIÉN LEÍDA de OneDrive) solo las
 * entradas de `nuevas` que no estén ya. No toca nada más de la ficha.
 * Devuelve { ficha, añadidas } — ficha es un objeto nuevo; la original no se modifica.
 */
export function fusionarHistorial(ficha, nuevas) {
  comprobarFicha(ficha);
  const copia = JSON.parse(JSON.stringify(ficha));
  const v = copia.valores;
  if (v.HISTORIAL == null || v.HISTORIAL === '') v.HISTORIAL = [];
  if (!Array.isArray(v.HISTORIAL))
    throw new Error('El historial de la ficha tiene un formato inesperado. No se toca.');
  const existentes = new Set(v.HISTORIAL.map(claveEntrada));
  let añadidas = 0;
  for (const e of nuevas) {
    const k = claveEntrada(e);
    if (existentes.has(k)) continue;
    v.HISTORIAL.push(normalizarEntrada(e));
    existentes.add(k);
    añadidas++;
  }
  return { ficha: copia, añadidas };
}

// ---------- Leer y escribir el JSON igual que lo hace Python ----------
const quitaBOM = (t) => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t);

/** Lee los bytes de la ficha y averigua su «estilo» para escribirla igual. */
export function leerFichaBytes(bytes) {
  const tieneBOM = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const limpio = quitaBOM(texto);
  const obj = JSON.parse(limpio);
  const m = limpio.match(/\n( +|\t+)"/);
  const estilo = {
    bom: tieneBOM,
    sangria: m ? m[1] : null,
    ascii: !/[^\x00-\x7f]/.test(limpio),
    crlf: limpio.includes('\r\n'),
    finalNL: /\n$/.test(limpio),
  };
  return { obj, estilo };
}

function cadenaPy(s, ascii) {
  let o = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"') o += '\\"';
    else if (ch === '\\') o += '\\\\';
    else if (ch === '\n') o += '\\n';
    else if (ch === '\r') o += '\\r';
    else if (ch === '\t') o += '\\t';
    else if (ch === '\b') o += '\\b';
    else if (ch === '\f') o += '\\f';
    else if (c < 0x20 || (ascii && c > 0x7e)) {
      if (c > 0xffff) {
        const v = c - 0x10000;
        o += '\\u' + (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + '\\u' + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
      } else o += '\\u' + c.toString(16).padStart(4, '0');
    } else o += ch;
  }
  return o + '"';
}

/** Equivalente a json.dumps(obj, indent=?, ensure_ascii=?) de Python. */
export function jsonComoPython(v, { sangria = null, ascii = true } = {}, nivel = 0) {
  const sep = sangria == null ? ', ' : ',';
  const nl = (n) => (sangria == null ? '' : '\n' + sangria.repeat(n));
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'string') return cadenaPy(v, ascii);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[' + v.map((x) => nl(nivel + 1) + jsonComoPython(x, { sangria, ascii }, nivel + 1)).join(sep) + nl(nivel) + ']';
  }
  const ks = Object.keys(v);
  if (!ks.length) return '{}';
  return '{' + ks.map((k) => nl(nivel + 1) + cadenaPy(k, ascii) + ': ' + jsonComoPython(v[k], { sangria, ascii }, nivel + 1)).join(sep) + nl(nivel) + '}';
}

/** Convierte la ficha en bytes con el mismo estilo que tenía el archivo original. */
export function escribirFichaBytes(obj, estilo) {
  let t = jsonComoPython(obj, { sangria: estilo.sangria, ascii: estilo.ascii });
  if (estilo.finalNL) t += '\n';
  if (estilo.crlf) t = t.replace(/\n/g, '\r\n');
  const cuerpo = new TextEncoder().encode(t);
  if (!estilo.bom) return cuerpo;
  const out = new Uint8Array(cuerpo.length + 3);
  out.set([0xef, 0xbb, 0xbf]);
  out.set(cuerpo, 3);
  return out;
}

// ---------- Fechas ----------
const dos = (n) => String(n).padStart(2, '0');
export const fechaES = (d = new Date()) => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
export const horaES = (d = new Date()) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
export const horaSegES = (d = new Date()) => `${horaES(d)}:${dos(d.getSeconds())}`;
export const esFechaES = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);
export const esHoraES = (s) => /^\d{2}:\d{2}$/.test(s);

// Para ordenar: "03/11/2026" + "10:15" -> "2026-11-03 10:15"
export const ordenEntrada = (e) => {
  const [d, m, a] = (e.FECHA || '').split('/');
  return `${a || ''}-${m || ''}-${d || ''} ${e.HORA || ''}`;
};

export function nombreFotoMovil(d = new Date(), extra = '') {
  const t = `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}_${dos(d.getHours())}${dos(d.getMinutes())}${dos(d.getSeconds())}`;
  const r = extra || Math.random().toString(36).slice(2, 6);
  return `MOVIL_${t}_${r}.jpg`;
}

// ---------- Registro de actividad ----------
export const CABECERA_REGISTRO = ['Fecha', 'Hora', 'Ordenador', 'Usuario', 'Acción', 'Detalle'];
const limpiaCelda = (s) => nfc(s).replace(/[\t\r\n]+/g, ' ').trim();

export function lineaRegistro({ fecha, hora, ordenador, usuario, accion, detalle }) {
  return [fecha, hora, ordenador, usuario, accion, detalle].map(limpiaCelda).join('\t') + '\r\n';
}

/**
 * Devuelve el contenido completo del registro con las líneas nuevas AL FINAL.
 * (Si el archivo ya existe con BOM o sin él, se respeta tal cual.)
 * `existente` son los bytes actuales del archivo (o null si no existe).
 * Nunca cambia ni quita un solo byte de lo que ya había.
 */
export function anexarRegistro(existente, lineas) {
  const enc = new TextEncoder();
  const partes = [];
  if (!existente || existente.length === 0) {
    // Igual que lo crea el PC: sin BOM, con línea de cabecera y fin de línea CRLF
    partes.push(enc.encode(CABECERA_REGISTRO.join('\t') + '\r\n'));
  } else {
    partes.push(existente);
    const fin = existente[existente.length - 1];
    if (fin !== 0x0a) partes.push(enc.encode('\r\n'));
  }
  for (const l of lineas) partes.push(enc.encode(l));
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

// ---------- Fotos y rutas ----------
export const esRutaWindows = (r) => /^[a-zA-Z]:[\\/]/.test(r || '') || /^\\\\/.test(r || '');
export const rutaRelativaLimpia = (r) =>
  (r || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');

const EXT_IMG = /\.(jpe?g|png|gif|bmp|webp|heic|tiff?)$/i;

/** Recorre la ficha y devuelve todas las fotos [{ruta, pie, origen}] sin repetir.
 *  `claves` (opcional): solo mira esos campos; `nombres`: etiqueta legible de cada campo. */
export function recogerFotos(valores, claves = null, nombres = {}) {
  const vistas = new Set();
  const out = [];
  const add = (ruta, pie, origen) => {
    if (!ruta || typeof ruta !== 'string' || !EXT_IMG.test(ruta)) return;
    const k = rutaRelativaLimpia(ruta).toLowerCase();
    if (vistas.has(k)) return;
    vistas.add(k);
    out.push({ ruta, pie: pie || '', origen });
  };
  const walk = (x, origen) => {
    if (Array.isArray(x)) x.forEach((y) => walk(y, origen));
    else if (x && typeof x === 'object') {
      if (typeof x.ruta === 'string') add(x.ruta, x.pie, origen);
      for (const [k, y] of Object.entries(x)) if (k !== 'ruta') walk(y, origen === 'Ficha' ? etiquetaCampo(k) : origen);
    } else if (typeof x === 'string') add(x, '', origen);
  };
  for (const [k, x] of Object.entries(valores || {})) {
    if (claves && !claves.includes(k)) continue;
    walk(x, nombres[k] || (k === 'HISTORIAL' ? 'Historial' : k === 'DETALLE_VEHICULOS' ? 'Vehículos' : etiquetaCampo(k)));
  }
  return out;
}

// "FECHA_NACIMIENTO" -> "Fecha nacimiento"
export function etiquetaCampo(k) {
  const s = String(k).replace(/_/g, ' ').toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function enlaceMaps(direccion) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(direccion);
}
