// ============================================================
//  LÓGICA PURA (sin red ni pantalla). Es la parte que protege
//  los datos del PC, por eso tiene pruebas propias en /pruebas.
// ============================================================

export const PROGRAMA = 'Generador de Fichas';
export const RE_EXPEDIENTE = /^(\d+)\s*-\s*(EDP\d+)/i;
export const CARPETA_FOTOS_MOVIL = 'Imagenes/Aportaciones';

const nfc = (s) => (s ?? '').toString().normalize('NFC');
const dos = (n) => String(n).padStart(2, '0');

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

export const limpiaTexto = (t) => nfc(t).replace(/\r\n?/g, '\n').trim();

// Dos entradas son «la misma» si coinciden fecha, hora y texto.
// Las notas de voz se distinguen por su audio (aunque se graben dos en el mismo minuto,
// y aunque el PC ya la haya transcrito o dividido en varias entradas con el mismo AUDIO).
// Las entradas sin texto (solo fotos) se distinguen además por sus fotos, para que dos
// de solo foto en el mismo minuto no se confundan.
export function claveEntrada(e) {
  const audio = rutaRelativaLimpia(limpiaTexto(e?.AUDIO)).toLowerCase();
  if (audio) return 'AUDIO\u0001' + audio;
  const texto = limpiaTexto(e?.TEXTO);
  const k = [limpiaTexto(e?.FECHA), limpiaTexto(e?.HORA), texto];
  if (!texto) k.push([...(e?.FOTOS || []), ...(e?.VIDEOS || [])].map((f) => rutaRelativaLimpia(limpiaTexto(f?.ruta)).toLowerCase()).filter(Boolean).sort().join('|'));
  const km = limpiarKM(e?.KM).km;
  if (km) k.push('KM' + km); // dos «Se inicia servicio.» en el mismo minuto con distintos km son distintas
  return k.join('\u0001');
}

// ---------- Kilómetros del coche (KM): texto, solo cifras ----------
// Acepta «84120», «84.120», «84 120 km», «84120,5» (se queda la parte entera).
// Devuelve { km: '84120' }, { km: '' } si está vacío, o { error } si no es un número válido.
export function limpiarKM(valor) {
  let s = limpiaTexto(valor).toLowerCase().replace(/km\.?/g, '').trim();
  if (!s) return { km: '' };
  s = s.split(',')[0];               // decimales con coma: fuera
  s = s.replace(/[.\s\u00a0']/g, '');   // separadores de miles: fuera
  if (!/^\d{1,7}$/.test(s)) return { error: 'Los km deben ser solo cifras (por ejemplo 84120).' };
  return { km: String(Number(s)) };
}
/** «84120» → «84.120» (para enseñarlo) */
export const formatoKM = (km) => String(km ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

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
  out.FOTOS = (e.FOTOS || []).map((f) => ({ ruta: f.ruta, pie: f.pie || '', ...(esSha256(f.sha256) ? { sha256: f.sha256 } : {}) }));
  if (Array.isArray(e.VIDEOS) && e.VIDEOS.length)
    out.VIDEOS = e.VIDEOS.map((f) => ({ ruta: f.ruta, pie: f.pie || '', ...(esSha256(f.sha256) ? { sha256: f.sha256 } : {}), ...(f.marca === true ? { marca: true } : {}) }));
  // Nota de voz: AUDIO, AUDIO_ESTADO ("pendiente"), AUDIO_DURACION (segundos, opcional), ordenador
  if (limpiaTexto(e.AUDIO)) {
    out.AUDIO = rutaRelativaLimpia(limpiaTexto(e.AUDIO));
    out.AUDIO_ESTADO = 'pendiente';
    const d = Number(e.AUDIO_DURACION);
    if (Number.isFinite(d) && d > 0) out.AUDIO_DURACION = Math.round(d * 10) / 10;
    if (esSha256(e.AUDIO_SHA256)) out.AUDIO_SHA256 = e.AUDIO_SHA256;
  }
  // Km del coche: solo si se anotaron, como texto y solo cifras
  const km = limpiarKM(e.KM);
  if (km.km) out.KM = km.km;
  // Trayecto despacho ↔ servicio (solo para facturar: el PC no lo imprime)
  const tr = tipoTrayecto(e);
  if (tr && limpiaTexto(e.TRAYECTO)) out.TRAYECTO = tr;
  if (out.AUDIO || out.KM || out.TRAYECTO) out.ordenador = 'Móvil';
  return out;
}

// ---------- Lo que el PC manda: entradas ya presentes y entradas descartadas ----------
const normEsp = (t) => limpiaTexto(t).replace(/\s+/g, ' ').trim();
const primeros60 = (t) => Array.from(normEsp(t)).slice(0, 60).join(''); // 60 caracteres, como Python

/** Clave con la que el PC apunta en valores._DESCARTADAS lo que corrigió o quitó:
 *  ["h", FECHA, HORA, primeros 60 caracteres del TEXTO con espacios normalizados] (+ ruta del AUDIO). */
export function claveDescartada(e) {
  const k = ['h', limpiaTexto(e?.FECHA), limpiaTexto(e?.HORA), primeros60(e?.TEXTO)];
  const audio = rutaRelativaLimpia(limpiaTexto(e?.AUDIO));
  if (audio) k.push(audio);
  return k;
}

/**
 * ¿El PC ha descartado (corregido o quitado) esta entrada?
 * `descartadas` es valores._DESCARTADAS tal como lo guarde el PC:
 *  - una lista de claves (formato del encargo), o
 *  - un apartado por campo, { "HISTORIAL": [...], "GALERIA_INVESTIGADO": [...] } (formato real del programa 7.x).
 * Cada clave puede venir como lista o como texto JSON, y el texto puede estar en MAYÚSCULAS y SIN ESPACIOS,
 * así que se compara «en limpio» (sin espacios, sin acentos, en mayúsculas).
 */
const canon = (t) => limpiaTexto(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, '');
export function estaDescartada(e, descartadas) {
  const lista = Array.isArray(descartadas) ? descartadas
    : descartadas && typeof descartadas === 'object' ? (Array.isArray(descartadas.HISTORIAL) ? descartadas.HISTORIAL : []) : [];
  if (!lista.length) return false;
  const f = canon(e?.FECHA), hh = canon(e?.HORA), txt = canon(e?.TEXTO);
  const audio = canon(rutaRelativaLimpia(limpiaTexto(e?.AUDIO)));
  return lista.some((d) => {
    let l = d;
    for (let i = 0; i < 2 && typeof l === 'string'; i++) { try { l = JSON.parse(l); } catch { return false; } }
    if (!Array.isArray(l) || l.length < 4 || canon(l[0]) !== 'H') return false;
    if (canon(l[1]) !== f || canon(l[2]) !== hh) return false;
    const t = canon(l[3]);   // el PC guarda solo el principio del texto (60 caracteres)
    if (!(t === txt || (t.length >= 20 && txt.startsWith(t)))) return false;
    if (l.length >= 5) return !!audio && canon(rutaRelativaLimpia(String(l[4] ?? ''))) === audio; // era una nota de voz: tiene que ser esa
    return true;
  });
}

/** ¿Ya está esta entrada en el historial? Misma fecha, hora y texto (o mismo audio),
 *  o alguna de sus fotos ya está en otra entrada (entonces se subió antes y el PC la ha corregido). */
export function yaEsta(e, historial) {
  const lista = Array.isArray(historial) ? historial : [];
  const k = claveEntrada(e);
  const n = (r) => rutaRelativaLimpia(limpiaTexto(r)).toLowerCase();
  const fotos = new Set([...(e?.FOTOS || []), ...(e?.VIDEOS || [])].map((f) => n(f?.ruta)).filter(Boolean));
  const deX = (x) => [...(Array.isArray(x.FOTOS) ? x.FOTOS : []), ...(Array.isArray(x.VIDEOS) ? x.VIDEOS : [])];
  return lista.some((x) => x && (claveEntrada(x) === k || (fotos.size && deX(x).some((f) => fotos.has(n(f?.ruta))))));
}

// ---------- Copias en conflicto de OneDrive ----------
// Cuando OneDrive no sabe qué versión vale, guarda las dos y a una le añade el nombre del PC:
// «Información 0439-DESKTOP-0851N1F.json», «Registro de actividad 0439-DESKTOP-0851N1F.txt».
export function copiasEnConflicto(nombres) {
  return (nombres || []).filter((x) => {
    const n = nfc(x).toLowerCase();
    return /^informaci[oó]n\s+\d+\s*-\s*\S.*\.json$/.test(n) || /^registro de actividad\s+\d+\s*-\s*\S.*\.txt$/.test(n);
  });
}

// ---------- Trayecto despacho ↔ servicio ----------
/** 'salida' | 'llegada' | null. Por la clave TRAYECTO (el PC acepta también «regreso» y «vuelta») o por el texto. */
export function tipoTrayecto(e) {
  const t = limpiaTexto(e?.TRAYECTO).toLowerCase();
  if (t === 'salida') return 'salida';
  if (['llegada', 'regreso', 'vuelta'].includes(t)) return 'llegada';
  const x = limpiaTexto(e?.TEXTO).replace(/\s+/g, ' ');
  if (/^salida del despacho/i.test(x)) return 'salida';
  if (/^(llegada|regreso|vuelta) al despacho/i.test(x)) return 'llegada';
  return null;
}
/** Si la última entrada de trayecto (hoy o ayer) es una SALIDA, la devuelve: falta registrar la llegada. */
export function trayectoAbierto(entradas, ahora = new Date()) {
  let ultima = null;
  for (const e of entradas || []) if (e && tipoTrayecto(e) && (!ultima || ordenEntrada(e) >= ordenEntrada(ultima))) ultima = e;
  if (!ultima || tipoTrayecto(ultima) !== 'salida') return null;
  const [d, m, a] = limpiaTexto(ultima.FECHA).split('/').map(Number);
  if (!a) return null;
  const dias = Math.round((new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) - new Date(a, m - 1, d)) / 86400000);
  return dias >= 0 && dias <= 1 ? ultima : null;
}

// ---------- Servicio abierto (inicio sin fin) ----------
export const esInicioServicio = (t) => /^se inicia servicio/i.test(limpiaTexto(t).replace(/\s+/g, ' '));
export const esFinServicio = (t) => /^finaliza servicio/i.test(limpiaTexto(t).replace(/\s+/g, ' '));
/**
 * Si la última entrada de inicio/fin de servicio es un INICIO de hoy o de ayer (servicios de noche),
 * devuelve esa entrada; si no, null. `entradas` en orden de creación (las pendientes al final).
 */
export function servicioAbierto(entradas, ahora = new Date()) {
  let ultima = null;
  for (const e of entradas || []) {
    if (!e || !(esInicioServicio(e.TEXTO) || esFinServicio(e.TEXTO))) continue;
    if (!ultima || ordenEntrada(e) >= ordenEntrada(ultima)) ultima = e; // a igual hora, la añadida después
  }
  if (!ultima || !esInicioServicio(ultima.TEXTO)) return null;
  const [d, m, a] = limpiaTexto(ultima.FECHA).split('/').map(Number);
  if (!a) return null;
  const dias = Math.round((new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) - new Date(a, m - 1, d)) / 86400000);
  return dias >= 0 && dias <= 1 ? ultima : null;
}

// ---------- Matrículas de la ficha ----------
/**
 * Matrículas para escribir con un toque: las de los vehículos de la ficha y las de los familiares
 * (campo «Vehículo / matrícula»). [{ matricula, detalle, de? }], sin repetir.
 */
const RE_MATRICULA = /\b(\d{4}\s?-?[B-DF-HJ-NP-TV-Z]{3}|[A-Z]{1,2}\s?-?\d{4}\s?-?[A-Z]{1,2})\b/i;
export function matriculasDeFicha(valores) {
  const vistas = new Set();
  const nueva = (m) => { const k = m.replace(/[\s-]/g, '').toUpperCase(); if (!k || vistas.has(k)) return false; vistas.add(k); return true; };
  const propias = (Array.isArray(valores?.DETALLE_VEHICULOS) ? valores.DETALLE_VEHICULOS : []).flatMap((v) => {
    const mat = limpiaTexto(v?.MATRICULA).toUpperCase();
    if (!mat || !nueva(mat)) return [];
    const det = [[v.MARCA, v.MODELO].map(limpiaTexto).filter(Boolean).join(' '), limpiaTexto(v.COLOR)].filter(Boolean).join(' · ');
    return [{ matricula: mat, detalle: det }];
  });
  const ajenas = (Array.isArray(valores?.OTROS_FAMILIARES) ? valores.OTROS_FAMILIARES : []).flatMap((p) => {
    const txt = limpiaTexto(p?.VEHICULO);
    if (!txt) return [];
    const m = txt.match(RE_MATRICULA);
    const mat = (m ? m[1] : txt).toUpperCase();
    if (!nueva(mat)) return [];
    const quien = [limpiaTexto(p.RELACION), [p.NOMBRE, p.APELLIDOS].map(limpiaTexto).filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    const resto = m ? limpiaTexto(txt.replace(m[1], ' ')).replace(/\s+/g, ' ').replace(/^[\s,·-]+|[\s,·-]+$/g, '') : '';
    return [{ matricula: mat, detalle: resto, de: quien || 'familiar' }];
  });
  return [...propias, ...ajenas];
}

/** Inserta `trozo` en `texto` en la posición `pos`, con un espacio delante y detrás si hace falta. */
export function insertarEnTexto(texto, pos, trozo) {
  const antes = texto.slice(0, pos), despues = texto.slice(pos);
  const pre = antes && !/\s$/.test(antes) ? ' ' : '';
  const post = despues && !/^[\s.,;:)]/.test(despues) ? ' ' : (despues ? '' : ' ');
  return { texto: antes + pre + trozo + post + despues, pos: (antes + pre + trozo + post).length };
}

// ---------- Hora (y lugar) de una foto ----------
/**
 * Lee del JPEG la fecha en que se hizo la foto (EXIF DateTimeOriginal, o DateTime) y,
 * si la tiene, su posición GPS. Todo en el móvil: la foto no sale de aquí.
 * Devuelve { fecha: Date | null, gps: { lat, lon } | null }.
 */
export function leerExif(buffer) {
  const sin = { fecha: null, gps: null };
  try {
    const v = new DataView(buffer);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return sin;
    let o = 2;
    while (o + 4 <= v.byteLength) {
      if (v.getUint8(o) !== 0xff) return sin;
      const marca = v.getUint8(o + 1), largo = v.getUint16(o + 2);
      if (marca === 0xda || marca === 0xd9) return sin;            // empiezan los datos de imagen: no hay EXIF
      if (marca === 0xe1 && v.getUint32(o + 4) === 0x45786966) {    // "Exif"
        const t = o + 10;                                           // cabecera TIFF
        const le = v.getUint16(t) === 0x4949;
        const u16 = (p) => v.getUint16(p, le), u32 = (p) => v.getUint32(p, le);
        const ascii = (p, n) => { let r = ''; for (let i = 0; i < n; i++) { const c = v.getUint8(p + i); if (!c) break; r += String.fromCharCode(c); } return r; };
        const leerIFD = (p) => {
          const out = {}; const n = u16(t + p);
          for (let i = 0; i < n; i++) {
            const e = t + p + 2 + i * 12, tag = u16(e), tipo = u16(e + 2), cuenta = u32(e + 4);
            const tam = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 })[tipo] || 1;
            const pos = cuenta * tam > 4 ? t + u32(e + 8) : e + 8;
            if (tipo === 2) out[tag] = ascii(pos, cuenta);
            else if (tipo === 3) out[tag] = u16(pos);
            else if (tipo === 4) out[tag] = u32(pos);
            else if (tipo === 5) out[tag] = Array.from({ length: cuenta }, (_, k) => u32(pos + k * 8) / (u32(pos + k * 8 + 4) || 1));
          }
          return out;
        };
        const ifd0 = leerIFD(u32(t + 4));
        const exif = ifd0[0x8769] ? leerIFD(ifd0[0x8769]) : {};
        const gpsI = ifd0[0x8825] ? leerIFD(ifd0[0x8825]) : {};
        const m = String(exif[0x9003] || exif[0x9004] || ifd0[0x0132] || '').match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
        const fecha = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
        let gps = null;
        if (Array.isArray(gpsI[2]) && Array.isArray(gpsI[4])) {
          const g = (x) => x[0] + (x[1] || 0) / 60 + (x[2] || 0) / 3600;
          const lat = g(gpsI[2]) * (/s/i.test(gpsI[1] || '') ? -1 : 1), lon = g(gpsI[4]) * (/w/i.test(gpsI[3] || '') ? -1 : 1);
          if (Number.isFinite(lat) && Number.isFinite(lon) && (lat || lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) gps = { lat, lon };
        }
        return { fecha: fecha && !isNaN(fecha) && fecha.getFullYear() > 2000 ? fecha : null, gps };
      }
      o += 2 + largo;
    }
  } catch { /* foto sin EXIF legible */ }
  return sin;
}

/**
 * Fecha de grabación de un vídeo MP4/MOV (caja «mvhd»: segundos desde 1904, en UTC).
 * `trozos`: los bytes del principio y/o del final del archivo (la cámara a veces la pone al final).
 */
export function leerFechaMp4(...trozos) {
  for (const buf of trozos) {
    if (!buf) continue;
    const b = new Uint8Array(buf), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    for (let i = 4; i + 16 <= b.length; i++) {
      if (b[i] !== 0x6d || b[i + 1] !== 0x76 || b[i + 2] !== 0x68 || b[i + 3] !== 0x64) continue; // "mvhd"
      const ver = b[i + 4];
      const seg = ver === 1 ? Number(v.getBigUint64(i + 8)) : v.getUint32(i + 8);
      const ms = (seg - 2082844800) * 1000;
      const f = new Date(ms);
      if (seg > 2082844800 && f.getFullYear() > 2000 && f.getFullYear() < 2100) return f;
    }
  }
  return null;
}

/** Fecha y hora en el nombre del archivo: «20261120_091205.jpg», «IMG_20261120-091205», «2026-11-20 09-12-05»… */
export function fechaDeNombre(nombre) {
  const m = String(nombre || '').match(/(20\d\d)[-_.]?(\d\d)[-_.]?(\d\d)[ _T-]?(\d\d)[-_.:h]?(\d\d)(?:[-_.:m]?(\d\d))?/);
  if (!m) return null;
  const [a, mes, d, h, mi, se] = m.slice(1).map((x) => Number(x || 0));
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || se > 59) return null;
  const f = new Date(a, mes - 1, d, h, mi, se);
  return isNaN(f) ? null : f;
}

// ---------- Resumen del día ----------
/**
 * Resumen de un día con las entradas de la ficha y las pendientes (en orden de creación):
 * tramos de servicio (inicio → fin), km (mayor − menor, como el PC), nº de entradas y de fotos.
 */
export function resumenDia(entradas, fecha) {
  const delDia = (entradas || []).map((e, i) => [e, i]).filter(([e]) => e && limpiaTexto(e.FECHA) === fecha)
    .sort(([a, ia], [b, ib]) => ordenEntrada(a).localeCompare(ordenEntrada(b)) || ia - ib).map(([e]) => e);
  if (!delDia.length) return null;
  const min = (h) => { const [a, b] = limpiaTexto(h).split(':').map(Number); return a * 60 + (b || 0); };
  const tramos = [];
  let abierto = null;
  for (const e of delDia) {
    if (esInicioServicio(e.TEXTO)) { if (!abierto) abierto = e.HORA; }
    else if (esFinServicio(e.TEXTO) && abierto) { tramos.push([abierto, e.HORA]); abierto = null; }
  }
  const minutos = tramos.reduce((s, [a, b]) => s + Math.max(0, min(b) - min(a)), 0);
  const kms = delDia.map((e) => Number(limpiarKM(e.KM).km)).filter((n) => n > 0);
  const km = (e) => Number(limpiarKM(e?.KM).km) || null;
  const primero = (f) => delDia.find((e) => f(e) && km(e));
  const ultimo = (f) => [...delDia].reverse().find((e) => f(e) && km(e));
  // Facturables: de la salida del despacho a la llegada; si falta alguna, la mayor lectura menos la menor
  const sal = primero((e) => tipoTrayecto(e) === 'salida'), lle = ultimo((e) => tipoTrayecto(e) === 'llegada');
  const kmFacturables = sal && lle && km(lle) >= km(sal) ? km(lle) - km(sal) : kms.length >= 2 ? Math.max(...kms) - Math.min(...kms) : null;
  // Durante el servicio (informativo: lo que se movió el investigado)
  const ini = primero((e) => esInicioServicio(e.TEXTO)), fin = ultimo((e) => esFinServicio(e.TEXTO));
  const kmServicio = ini && fin && km(fin) >= km(ini) ? km(fin) - km(ini) : null;
  return {
    entradas: delDia.filter((e) => !tipoTrayecto(e)).length,
    fotos: delDia.reduce((s, e) => s + (Array.isArray(e.FOTOS) ? e.FOTOS.length : 0), 0),
    tramos, abiertoDesde: abierto, minutos,
    kmDesde: kms.length >= 2 ? Math.min(...kms) : null, kmHasta: kms.length >= 2 ? Math.max(...kms) : null,
    kmFacturables, kmServicio,
    kmTrayecto: kmFacturables != null && kmServicio != null && sal && lle ? kmFacturables - kmServicio : null,
    conTrayecto: !!(sal && lle),
  };
}
export const duracionHM = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;

// ---------- Huella digital (SHA-256) de fotos, audios y vídeos ----------
// Se calcula en el móvil, al guardar la entrada y antes de subir nada: así se puede demostrar
// después que el archivo entregado es exactamente el que se hizo sobre el terreno.
const K256 = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
/** SHA-256 por trozos (para archivos grandes que no caben de golpe en memoria). */
export function crearSha256() {
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64), buf = new Uint8Array(64);
  let lleno = 0, total = 0;
  const bloque = (b, o) => {
    for (let i = 0; i < 16; i++) W[i] = (b[o + i * 4] << 24) | (b[o + i * 4 + 1] << 16) | (b[o + i * 4 + 2] << 8) | b[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15], y = W[i - 2];
      W[i] = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + W[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + W[i - 16];
    }
    let [a, bb, c, d, e, f, g, hh] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) | 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += bb; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += hh;
  };
  return {
    añadir(datos) {
      const d = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
      total += d.length;
      let i = 0;
      if (lleno) { const n = Math.min(64 - lleno, d.length); buf.set(d.subarray(0, n), lleno); lleno += n; i = n; if (lleno === 64) { bloque(buf, 0); lleno = 0; } }
      for (; i + 64 <= d.length; i += 64) bloque(d, i);
      if (i < d.length) { buf.set(d.subarray(i), 0); lleno = d.length - i; }
    },
    fin() {
      const bits = total * 8, relleno = new Uint8Array(((lleno < 56 ? 56 : 120) - lleno) + 8);
      relleno[0] = 0x80;
      const v = new DataView(relleno.buffer), L = relleno.length;
      v.setUint32(L - 8, Math.floor(bits / 0x100000000)); v.setUint32(L - 4, bits >>> 0);
      this.añadir(relleno);
      return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
    },
  };
}
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
/** Huella SHA-256 (hex) de un Blob/File. Los grandes, por trozos de 8 MB; `progreso(0..1)` opcional. */
export async function huellaSha256(blob, progreso) {
  if (blob.size <= 64 * 1024 * 1024 && globalThis.crypto?.subtle)
    return hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
  const h = crearSha256(), T = 8 * 1024 * 1024;
  for (let o = 0; o < blob.size; o += T) { h.añadir(new Uint8Array(await blob.slice(o, o + T).arrayBuffer())); progreso?.(Math.min(1, (o + T) / blob.size)); }
  return h.fin();
}
export const esSha256 = (x) => /^[0-9a-f]{64}$/.test(String(x || ''));

// ---------- Notas de voz ----------
export const CARPETA_AUDIOS = 'Audios';
export const CARPETA_VIDEOS = 'Videos';
/** "Nota 2026-11-03 10-42-15.m4a" (fecha y hora de inicio, con segundos) */
export function nombreNotaVoz(d, ext = 'm4a') {
  return `Nota ${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}-${dos(d.getMinutes())}-${dos(d.getSeconds())}.${ext}`;
}
/** Nombre alternativo si ya existe: "Nota … (2).m4a", "(3)"… */
export const nombreAlternativoAudio = (nombre, n) => nombre.replace(/(\.\w+)$/, ` (${n})$1`);
/** Formato de grabación: M4A (AAC) si el móvil graba AAC de verdad; si no, WebM/Opus.
 *  (No se usa «audio/mp4» a secas: algunos navegadores meten Opus dentro de un .m4a.) */
export function elegirFormatoAudio(soporta) {
  for (const [tipo, ext] of [['audio/mp4;codecs=mp4a.40.2', 'm4a'], ['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/ogg;codecs=opus', 'ogg']])
    if (soporta(tipo)) return { tipo, ext };
  return { tipo: '', ext: 'webm' };
}
/** Extensión según lo que el móvil ha grabado de verdad. */
export const extensionAudio = (mime, porDefecto = 'webm') =>
  /mp4a|aac/i.test(mime) ? 'm4a' : /webm/i.test(mime) ? 'webm' : /ogg/i.test(mime) ? 'ogg' : /mp4/i.test(mime) ? 'mp4' : porDefecto;

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
  return { obj, estilo, texto: limpio };
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

// ---------- Añadir al historial SIN reescribir el archivo ----------
// La ficha NO se vuelve a escribir entera: se copia el texto original carácter a
// carácter y solo se INSERTAN las entradas nuevas al final de valores.HISTORIAL.
// Así se conserva todo lo que haya escrito el PC (datos que la app no conoce,
// «giro», «tapar», «VIA», «ordenador», formato de los números, orden...).

const ESP = ' \t\r\n';
const saltaEsp = (t, i) => { while (i < t.length && ESP.includes(t[i])) i++; return i; };
const malFormado = () => new Error('La ficha tiene un formato JSON inesperado. No se toca.');

function finCadena(t, i) {
  if (t[i] !== '"') throw malFormado();
  for (let j = i + 1; j < t.length; j++) {
    if (t[j] === '\\') j++;
    else if (t[j] === '"') return j + 1;
  }
  throw malFormado();
}

/** Recorre un valor JSON que empieza en i. Devuelve dónde acaba y, si es objeto o lista, sus partes. */
function escanear(t, i) {
  const c = t[i];
  if (c === '"') return { ini: i, fin: finCadena(t, i) };
  if (c === '{' || c === '[') {
    const esObj = c === '{', cierre = esObj ? '}' : ']';
    const partes = [];
    let j = saltaEsp(t, i + 1);
    if (t[j] === cierre) return { ini: i, fin: j + 1, partes };
    for (;;) {
      let clave = null, iClave = null;
      if (esObj) {
        iClave = j;
        const fc = finCadena(t, j);
        clave = JSON.parse(t.slice(j, fc));
        j = saltaEsp(t, fc);
        if (t[j] !== ':') throw malFormado();
        j = saltaEsp(t, j + 1);
      }
      const v = escanear(t, j);
      partes.push({ clave, iClave, valor: v });
      j = saltaEsp(t, v.fin);
      if (t[j] === ',') { j = saltaEsp(t, j + 1); continue; }
      if (t[j] === cierre) return { ini: i, fin: j + 1, partes };
      throw malFormado();
    }
  }
  let j = i;
  while (j < t.length && /[-+0-9.eEa-zA-Z]/.test(t[j])) j++;
  if (j === i) throw malFormado();
  return { ini: i, fin: j };
}

/** Sangría (espacios o tabuladores) de la línea en la que está la posición i. */
const sangriaDeLinea = (t, i) => { const a = t.lastIndexOf('\n', i - 1) + 1; return t.slice(a, i).match(/^[ \t]*/)[0]; };
const nivelDe = (sang, estilo) => (estilo.sangria ? Math.round(sang.length / estilo.sangria.length) : 0);

function deepIgual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepIgual(a[k], b[k]));
}

/**
 * Añade al historial las entradas de `nuevas` que no estén ya (por fecha, hora y texto).
 * `bytes` es el archivo RECIÉN LEÍDO de OneDrive. Devuelve { bytes, añadidas }.
 * Todo lo que ya había queda idéntico byte a byte; solo se insertan las entradas nuevas.
 */
export function añadirAlHistorialBytes(bytes, nuevas) {
  const { obj, estilo, texto: t } = leerFichaBytes(bytes);
  comprobarFicha(obj);
  const h0 = obj.valores.HISTORIAL;
  if (!(h0 == null || h0 === '' || Array.isArray(h0)))
    throw new Error('El historial de la ficha tiene un formato inesperado. No se toca.');

  // Qué entradas son nuevas de verdad: no están ya (aunque el PC las haya corregido)
  // y el PC no las ha descartado (valores._DESCARTADAS, que se conserva tal cual)
  const existentes = [...(Array.isArray(h0) ? h0 : [])];
  const añadir = [];
  let descartadas = 0;
  for (const e of nuevas) {
    if (yaEsta(e, existentes)) continue;
    if (estaDescartada(e, obj.valores._DESCARTADAS)) { descartadas++; continue; }
    const n = normalizarEntrada(e);
    existentes.push(n);
    añadir.push(n);
  }
  if (!añadir.length) return { bytes, añadidas: 0, descartadas };

  const conv = (s) => (estilo.crlf ? s.replace(/\r?\n/g, '\r\n') : s);
  const ser = (v, nivel) => conv(jsonComoPython(v, { sangria: estilo.sangria, ascii: estilo.ascii }, nivel));

  // Localizar valores y valores.HISTORIAL en el texto original
  const raiz = escanear(t, saltaEsp(t, 0));
  const pValores = raiz.partes?.find((p) => p.clave === 'valores');
  if (!pValores || !pValores.valor.partes) throw malFormado();
  const valores = pValores.valor;
  const pHist = [...valores.partes].reverse().find((p) => p.clave === 'HISTORIAL'); // JSON usa la última si se repite

  let nuevo;
  if (pHist && pHist.valor.partes && pHist.valor.partes.length) {
    // Caso normal: lista con entradas → se insertan después de la última
    const arr = pHist.valor, els = arr.partes, ultimo = els[els.length - 1].valor;
    const sep = els.length >= 2
      ? t.slice(els[0].valor.fin, els[1].valor.ini)
      : (() => { const ws = t.slice(arr.ini + 1, els[0].valor.ini); return ws.includes('\n') ? ',' + ws : (estilo.sangria == null ? ', ' : ',' + ws); })();
    const nivel = nivelDe(sangriaDeLinea(t, els[0].valor.ini), estilo);
    nuevo = t.slice(0, ultimo.fin) + añadir.map((e) => sep + ser(e, nivel)).join('') + t.slice(ultimo.fin);
  } else if (pHist) {
    // Lista vacía, null o "" → se sustituye solo ese valor
    const nivel = nivelDe(sangriaDeLinea(t, pHist.iClave), estilo);
    nuevo = t.slice(0, pHist.valor.ini) + ser(añadir, nivel) + t.slice(pHist.valor.fin);
  } else if (valores.partes.length) {
    // No existe HISTORIAL → se añade como primer dato de «valores»
    const p0 = valores.partes[0];
    const ws = t.slice(valores.ini + 1, p0.iClave);
    const nivel = nivelDe(sangriaDeLinea(t, p0.iClave), estilo);
    nuevo = t.slice(0, p0.iClave) + cadenaPy('HISTORIAL', estilo.ascii) + ': ' + ser(añadir, nivel) + ',' + (ws || (estilo.sangria == null ? ' ' : '')) + t.slice(p0.iClave);
  } else {
    const nivel = nivelDe(sangriaDeLinea(t, valores.ini), estilo);
    nuevo = t.slice(0, valores.ini) + ser({ HISTORIAL: añadir }, nivel) + t.slice(valores.fin);
  }

  // Comprobación de seguridad: el resultado debe ser exactamente la ficha leída + las entradas nuevas
  const esperado = JSON.parse(JSON.stringify(obj));
  esperado.valores.HISTORIAL = [...(Array.isArray(h0) ? h0 : []), ...añadir];
  let leido;
  try { leido = JSON.parse(nuevo); } catch { throw new Error('Error interno al preparar la ficha. No se ha guardado nada.'); }
  if (!deepIgual(leido, esperado)) throw new Error('Error interno al preparar la ficha. No se ha guardado nada.');

  const cuerpo = new TextEncoder().encode(nuevo);
  if (!estilo.bom) return { bytes: cuerpo, añadidas: añadir.length, descartadas };
  const out = new Uint8Array(cuerpo.length + 3);
  out.set([0xef, 0xbb, 0xbf]);
  out.set(cuerpo, 3);
  return { bytes: out, añadidas: añadir.length, descartadas };
}

// ---------- Fechas ----------
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

// "FECHA_NACIMIENTO" -> "Fecha nacimiento"; "OTROS_FAMILIARES" -> "Otros familiares"; con tildes en las palabras habituales
const TILDES = { direccion: 'dirección', relacion: 'relación', telefono: 'teléfono', vehiculo: 'vehículo', vehiculos: 'vehículos',
  anio: 'año', poblacion: 'población', informacion: 'información', patologias: 'patologías', ubicacion: 'ubicación',
  matricula: 'matrícula', titulo: 'título', numero: 'número', codigo: 'código', situacion: 'situación', descripcion: 'descripción' };
export function etiquetaCampo(k) {
  const s = String(k).replace(/_/g, ' ').toLowerCase().trim().split(/\s+/).map((p) => TILDES[p] || p).join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function enlaceMaps(direccion) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(direccion);
}
/** Ruta en coche desde donde estás hasta esa dirección (Google Maps calcula el origen). */
export function enlaceRuta(direccion) {
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + encodeURIComponent(direccion);
}
