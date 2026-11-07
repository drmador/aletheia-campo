// ============================================================
//  ALETHEIA CAMPO — pantallas y funcionamiento general
// ============================================================
import { CONFIG } from './config.js';
import * as auth from './auth.js';
import { kv, cache, pendientes, borrarTodo } from './almacen.js';
import { crearGraph } from './graph.js';
import { crearOperaciones } from './operaciones.js';
import * as L from './logica.js';
import * as B from './bloqueo.js';
import { h, vistaDatos, vistaVehiculos, vistaPropiedades, minimizar, CLAVES_FOTOS, NOMBRES_CAMPOS, lugarConMapa, linkMapa } from './vistas.js';

const VERSION_APP = '1.3.0';
const app = document.getElementById('app');
const graph = crearGraph({ token: auth.token });

let desbloqueada = false;
let ocultaDesde = 0;
let alSincronizar = null;      // lo que hay que repintar cuando termina una subida
let antesDeSalir = null;       // aviso si hay un borrador sin guardar
const vistas = {};

// ---------------------------------------------------------------- utilidades
const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const enLinea = () => navigator.onLine;

function pantalla(titulo, { atras = false, acciones = [] } = {}, ...contenido) {
  const main = h('main', {}, ...contenido);
  app.replaceChildren(
    h('header', { class: 'barra' },
      atras ? h('button', { 'aria-label': 'Atrás', onclick: () => history.back() }, '←') : null,
      h('h1', {}, titulo),
      ...acciones),
    main);
  window.scrollTo(0, 0);
  return main;
}

function estado(main, texto, tipo = '') {
  let e = main.querySelector(':scope > .estado');
  if (!texto) { e?.remove(); return; }
  if (!e) { e = h('p', { class: 'estado' }); main.prepend(e); }
  e.className = 'estado ' + tipo;
  e.textContent = texto;
}

// Navegación con el botón «atrás» de Android
function ir(vista, args = {}, { reemplazar = false } = {}) {
  const st = { vista, args };
  reemplazar ? history.replaceState(st, '') : history.pushState(st, '');
  mostrar(st);
}
let estadoActual = null;
function mostrar(st) {
  estadoActual = st;
  alSincronizar = null;
  antesDeSalir = null;
  (vistas[st?.vista] || vistas.directorio)(st?.args || {});
}
addEventListener('popstate', (e) => {
  if (!desbloqueada) return;
  if (antesDeSalir && !antesDeSalir()) { history.pushState(estadoActual, ''); return; }
  mostrar(e.state);
});

// Miniaturas de OneDrive (máximo 4 a la vez)
const urlsMini = new Map();
const colaMini = [];
let activasMini = 0;
function pedirMini(tarea) {
  colaMini.push(tarea);
  (function siguiente() {
    while (activasMini < 4 && colaMini.length) {
      const t = colaMini.shift();
      activasMini++;
      t().catch(() => {}).finally(() => { activasMini--; siguiente(); });
    }
  })();
}

function verFoto(src, pie) {
  const v = h('div', { class: 'visor', role: 'dialog' },
    h('button', { 'aria-label': 'Cerrar', onclick: () => v.remove() }, '✕'),
    h('img', { src, alt: pie || 'Foto' }),
    pie ? h('div', { class: 'pie' }, pie) : null);
  document.body.append(v);
}

/** Pinta una lista de fotos de la ficha [{ruta, pie}] o rutas sueltas. */
function rejillaFotos(carpeta, fotos) {
  return h('div', { class: 'rejilla' }, fotos.map((f) => {
    const ruta = typeof f === 'string' ? f : f.ruta;
    const pie = typeof f === 'string' ? '' : f.pie || f.origen || '';
    const caja = h('div', { class: 'mini', title: ruta }, L.esRutaWindows(ruta) ? 'Foto guardada fuera del expediente (solo en el PC)' : '…');
    if (L.esRutaWindows(ruta)) return caja;
    const rel = L.rutaRelativaLimpia(ruta);
    const clave = carpeta.id + '|' + rel;
    const poner = (url) => { caja.textContent = ''; caja.append(h('img', { src: url, alt: pie || rel, loading: 'lazy' })); };
    if (urlsMini.has(clave)) poner(urlsMini.get(clave));
    else if (!enLinea()) caja.textContent = 'Sin conexión';
    else pedirMini(async () => {
      const it = await graph.itemPorRuta(carpeta.driveId, carpeta.id, rel);
      if (!it) { caja.textContent = 'No encontrada: ' + rel; return; }
      const url = await graph.miniatura(carpeta.driveId, it.id);
      if (url) { urlsMini.set(clave, url); poner(url); } else caja.textContent = it.name;
    });
    caja.addEventListener('click', async () => {
      if (L.esRutaWindows(ruta) || !enLinea()) return;
      const it = await graph.itemPorRuta(carpeta.driveId, carpeta.id, rel).catch(() => null);
      if (it?.['@microsoft.graph.downloadUrl']) verFoto(it['@microsoft.graph.downloadUrl'], pie);
    });
    return h('div', {}, caja, pie ? h('p', { class: 'pie-foto sub' }, pie) : null);
  }));
}

// ---------------------------------------------------------------- arranque
async function iniciar() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!auth.configurada()) {
    return pantalla('Aletheia Campo', {}, h('div', { class: 'centro' },
      h('img', { class: 'logo', src: 'icons/icono.svg', alt: '' }),
      h('p', {}, 'Falta el «ID de cliente» de Microsoft.'),
      h('p', { class: 'sub' }, 'Ábrelo en js/config.js y sigue la GUIA.md, paso 2.')));
  }
  try {
    if (await auth.procesarVuelta()) await kv.del('usuario');
  } catch (e) {
    return pantallaEntrar(e.message);
  }
  if (!(await auth.hayCuenta())) return pantallaEntrar();
  if (!(await B.tienePin())) return pantallaPin({ crear: true });
  bloquear();
}

function pantallaEntrar(error) {
  const main = pantalla('Aletheia Campo', {}, h('div', { class: 'centro' },
    h('img', { class: 'logo', src: 'icons/icono.svg', alt: '' }),
    h('h2', {}, 'Aletheia Campo'),
    h('p', { class: 'sub' }, 'Consulta de expedientes e historial sobre el terreno.'),
    h('button', { class: 'boton ancho', onclick: () => auth.entrar() }, 'Entrar con mi cuenta de Microsoft'),
    h('p', { class: 'sub' }, 'Los datos van directamente de este móvil a tu OneDrive.')));
  if (error) estado(main, error, 'error');
}

// ---------------------------------------------------------------- PIN y huella
function teclado({ titulo, subtitulo, alAceptar, huella }) {
  let pin = '';
  const puntos = h('div', { class: 'pin', 'aria-live': 'polite' });
  const msg = h('p', { class: 'sub' }, subtitulo || '');
  const pintar = () => puntos.replaceChildren(...Array.from({ length: Math.max(4, pin.length) }, (_, i) => h('span', { class: i < pin.length ? 'lleno' : '' })));
  const tecla = (t) => h('button', { type: 'button', onclick: async () => {
    if (t === '⌫') pin = pin.slice(0, -1);
    else if (t === '✓') { if (pin.length >= 4) { const p = pin; pin = ''; pintar(); await alAceptar(p, msg); } return; }
    else if (pin.length < 8) pin += t;
    pintar();
  } }, t);
  pintar();
  return h('div', { class: 'centro' },
    h('img', { class: 'logo', src: 'icons/icono.svg', alt: '' }),
    h('h2', {}, titulo), msg, puntos,
    h('div', { class: 'teclado' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(tecla)),
    huella ? h('p', {}, h('button', { class: 'boton sec', onclick: huella }, '☝ Usar huella')) : null);
}

function pantallaPin({ crear = false, cambiar = false } = {}) {
  let primero = null;
  const main = pantalla(crear ? 'Crear PIN' : 'Cambiar PIN', { atras: cambiar });
  main.append(teclado({
    titulo: 'Elige un PIN',
    subtitulo: 'Entre 4 y 8 cifras. Lo pedirá cada vez que abras la app.',
    alAceptar: async (pin, msg) => {
      if (!primero) { primero = pin; msg.textContent = 'Repítelo para confirmar.'; return; }
      if (pin !== primero) { primero = null; msg.textContent = 'No coinciden. Empieza otra vez.'; return; }
      await B.fijarPin(pin);
      if (cambiar) { history.back(); return; }
      desbloqueada = true;
      if (await B.huellaDisponible()) {
        const m2 = pantalla('Huella');
        m2.append(h('div', { class: 'centro' },
          h('p', {}, '¿Quieres abrir la app también con la huella?'),
          h('div', { class: 'botones' },
            h('button', { class: 'boton', onclick: async () => { try { await B.activarHuella(); } catch { /* el usuario canceló */ } trasDesbloquear(); } }, 'Sí, activar'),
            h('button', { class: 'boton sec', onclick: trasDesbloquear }, 'Ahora no'))));
      } else trasDesbloquear();
    },
  }));
}

/** Tapa la app con la pantalla de bloqueo (lo que hubiera debajo no se pierde). */
async function bloquear() {
  desbloqueada = false;
  if (document.querySelector('.capa-bloqueo')) return;
  const capa = h('div', { class: 'capa-bloqueo' });
  const quitar = () => { capa.remove(); const primera = !app.querySelector('header'); desbloqueada = true; if (primera) trasDesbloquear(); else sincronizar(); };
  const conHuella = await B.tieneHuella();
  const usarHuella = async () => { try { if (await B.comprobarHuella()) quitar(); } catch { /* cancelado */ } };
  capa.append(teclado({
    titulo: 'Aletheia Campo',
    subtitulo: 'Introduce tu PIN',
    huella: conHuella ? usarHuella : null,
    alAceptar: async (pin, msg) => {
      const r = await B.comprobarPin(pin);
      if (r.ok) return quitar();
      msg.textContent = r.esperar ? `Demasiados intentos. Espera ${r.esperar} s.` : `PIN incorrecto (${r.fallos}).`;
    },
  }));
  document.body.append(capa);
  if (conHuella) usarHuella();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) ocultaDesde = Date.now();
  else if (desbloqueada && ocultaDesde && Date.now() - ocultaDesde > CONFIG.MINUTOS_BLOQUEO * 60000) bloquear();
});

async function trasDesbloquear() {
  desbloqueada = true;
  navigator.storage?.persist?.().catch(() => {}); // que Android no borre las entradas pendientes
  const raiz = await kv.get('raiz');
  ir(raiz ? 'directorio' : 'elegirRaiz', {}, { reemplazar: true });
  sincronizar();
}

// ---------------------------------------------------------------- subida de pendientes
let sincronizando = false;
let ultimoErrorSesion = false;

async function obtenerOps() {
  let usuario = await kv.get('usuario');
  if (!usuario) {
    const yo = await graph.yo();
    usuario = yo.displayName || yo.userPrincipalName || 'Usuario';
    await kv.set('usuario', usuario);
  }
  return crearOperaciones(graph, { ordenador: CONFIG.ORDENADOR, usuario });
}

async function sincronizar() {
  if (sincronizando || !enLinea() || !desbloqueada) return;
  sincronizando = true; // se marca ANTES de esperar nada: así nunca hay dos subidas a la vez
  const lista = (await pendientes.todos()).sort((a, b) => a.creado - b.creado);
  if (!lista.length) { sincronizando = false; return actualizarChip(); }
  actualizarChip();
  let subidas = 0;
  try {
    const ops = await obtenerOps();
    ultimoErrorSesion = false;
    for (const p of lista) {
      try {
        await ops.procesarPendiente(p, (q) => pendientes.guardar({ ...q, error: null }));
        await pendientes.quitar(p.id);
        subidas++;
      } catch (e) {
        if (e instanceof auth.SesionCaducada) throw e;
        await pendientes.guardar({ ...p, error: e.message, intentos: (p.intentos || 0) + 1 });
        if (!enLinea()) break;
      }
    }
  } catch (e) {
    if (e instanceof auth.SesionCaducada) ultimoErrorSesion = true;
  } finally {
    sincronizando = false;
    actualizarChip();
    if (alSincronizar) alSincronizar(subidas);
  }
}
addEventListener('online', () => { sincronizar(); actualizarChip(); });
addEventListener('offline', actualizarChip);
setInterval(sincronizar, 60000);

async function actualizarChip() {
  const chip = document.querySelector('.chip-pend');
  if (!chip) return;
  const n = await pendientes.contar();
  chip.hidden = n === 0 && enLinea() && !ultimoErrorSesion;
  chip.textContent = ultimoErrorSesion ? '⚠ Entrar' : sincronizando ? `⟳ ${n}` : !enLinea() ? `Sin red${n ? ' · ' + n : ''}` : `⇪ ${n}`;
}
function chipPendientes() {
  const b = h('button', { class: 'chip-pend', hidden: true, title: 'Entradas pendientes de subir',
    onclick: () => (ultimoErrorSesion ? auth.entrar() : sincronizar()) });
  setTimeout(actualizarChip);
  return b;
}

// ---------------------------------------------------------------- elegir carpeta raíz
vistas.elegirRaiz = async () => {
  const pila = [];
  const main = pantalla('Carpeta de expedientes', { atras: !!(await kv.get('raiz')) });
  const migas = h('div', { class: 'migas' });
  const info = h('p', { class: 'sub' });
  const usar = h('button', { class: 'boton ancho' }, 'Usar esta carpeta');
  const lista = h('ul', { class: 'lista' });
  main.append(h('p', {}, 'Busca la carpeta donde están todas las carpetas de expedientes («0440 - EDP0150 - …»).'), migas, info, usar, h('p'), lista);

  async function abrir(carpeta) {
    lista.replaceChildren(h('li', { class: 'sub' }, 'Cargando…'));
    usar.disabled = true;
    try {
      const hijos = (await graph.hijos(carpeta.driveId, carpeta.id)).filter((x) => x.folder);
      const nExp = hijos.filter((x) => L.leerNombreCarpeta(x.name)).length;
      migas.textContent = pila.map((p) => p.name).join(' › ');
      info.textContent = nExp ? `Contiene ${nExp} carpetas de expediente.` : 'Esta carpeta no contiene expedientes.';
      usar.disabled = nExp === 0;
      usar.onclick = async () => {
        await kv.set('raiz', { driveId: carpeta.driveId, id: carpeta.id, name: carpeta.name, ruta: migas.textContent });
        await cache.set('directorio', null);
        ir('directorio', {}, { reemplazar: true });
      };
      lista.replaceChildren(
        pila.length > 1 ? h('li', { onclick: () => { pila.pop(); abrir(pila.at(-1)); } }, h('span', {}, '⬑'), h('div', { class: 'crece' }, 'Subir un nivel')) : null,
        ...hijos.filter((x) => !L.leerNombreCarpeta(x.name)).sort((a, b) => a.name.localeCompare(b.name, 'es')).map((x) =>
          h('li', { onclick: () => { const c = { driveId: carpeta.driveId, id: x.id, name: x.name }; pila.push(c); abrir(c); } },
            h('span', {}, '📁'), h('div', { class: 'crece' }, h('div', {}, x.name), h('div', { class: 'sub' }, `${x.folder.childCount} elementos`)))));
    } catch (e) {
      estado(main, e.message, 'error');
    }
  }
  try {
    const r = await graph.raiz();
    const c = { driveId: r.parentReference.driveId, id: r.id, name: 'Mi OneDrive' };
    pila.push(c);
    abrir(c);
  } catch (e) {
    estado(main, enLinea() ? e.message : 'Hace falta conexión para elegir la carpeta.', 'error');
  }
};

// ---------------------------------------------------------------- directorio
vistas.directorio = async () => {
  const raiz = await kv.get('raiz');
  if (!raiz) return ir('elegirRaiz', {}, { reemplazar: true });
  const main = pantalla('Expedientes', { acciones: [chipPendientes(), h('button', { 'aria-label': 'Ajustes', onclick: () => ir('ajustes') }, '⚙')] });
  const buscar = h('input', { type: 'search', placeholder: 'Buscar por número, EDP o nombre…', autocomplete: 'off' });
  const lista = h('ul', { class: 'lista' });
  main.append(buscar, lista);
  let datos = (await cache.get('directorio')) || null;
  buscar.value = sessionStorage.getItem('busqueda') || '';

  const pintar = () => {
    sessionStorage.setItem('busqueda', buscar.value);
    const q = sinAcentos(buscar.value).trim().split(/\s+/).filter(Boolean);
    const filas = (datos?.lista || []).filter((x) => {
      const t = sinAcentos(`${x.numero} ${x.edp} ${x.investigado} ${x.name}`);
      return q.every((p) => t.includes(p));
    });
    lista.replaceChildren(...(filas.length ? filas.map((x) => h('li', { onclick: () => ir('expediente', { carpeta: x, pestana: 'historial' }) },
      h('span', { class: 'num' }, x.numero),
      h('div', { class: 'crece' }, h('div', {}, x.investigado || '(sin nombre)'), h('div', { class: 'sub' }, x.edp)))) :
      [h('li', { class: 'vacio' }, datos ? 'Ningún expediente coincide.' : 'Cargando…')]));
  };
  buscar.addEventListener('input', pintar);
  pintar();

  if (!enLinea()) { estado(main, datos ? 'Sin conexión: lista guardada en el móvil.' : 'Sin conexión y sin lista guardada.', 'aviso'); return; }
  try {
    const hijos = await graph.hijos(raiz.driveId, raiz.id);
    const lista2 = hijos.filter((x) => x.folder).map((x) => ({ ...L.leerNombreCarpeta(x.name), id: x.id, name: x.name, driveId: raiz.driveId }))
      .filter((x) => x.numero).sort((a, b) => Number(b.numero) - Number(a.numero) || b.name.localeCompare(a.name));
    datos = { lista: lista2, cuando: Date.now() };
    await cache.set('directorio', datos);
    pintar();
  } catch (e) {
    if (e instanceof auth.SesionCaducada) { ultimoErrorSesion = true; actualizarChip(); estado(main, 'La sesión de Microsoft ha caducado: pulsa «⚠ Entrar» arriba.', 'aviso'); }
    else estado(main, 'No se pudo actualizar: ' + e.message, 'error');
  }
};

// ---------------------------------------------------------------- expediente
const PESTANAS = [['historial', 'Historial'], ['datos', 'Datos'], ['vehiculos', 'Vehículos'], ['propiedades', 'Propiedades'], ['fotos', 'Fotos'], ['pdf', 'PDF']];

vistas.expediente = async ({ carpeta, pestana = 'historial' }) => {
  const main = pantalla(`${carpeta.numero} · ${carpeta.investigado || carpeta.edp}`, { atras: true, acciones: [chipPendientes()] });
  const nav = h('nav', { class: 'pestanas', role: 'tablist' });
  const cuerpo = h('div');
  main.before(nav);
  main.append(cuerpo);
  let ficha = await cache.get('ficha:' + carpeta.id);

  const elegir = (p) => {
    pestana = p;
    history.replaceState({ vista: 'expediente', args: { carpeta, pestana } }, '');
    nav.replaceChildren(...PESTANAS.map(([id, txt]) => h('button', { role: 'tab', 'aria-selected': String(id === p), onclick: () => elegir(id) }, txt)));
    pintar();
  };

  async function pintar() {
    const v = ficha?.obj?.valores;
    if (pestana === 'historial') return cuerpo.replaceChildren(...(await vistaHistorial(carpeta, v)));
    if (pestana === 'pdf') return cuerpo.replaceChildren(vistaPdf(carpeta));
    if (!v) return cuerpo.replaceChildren(h('p', { class: 'vacio' }, enLinea() ? 'Cargando ficha…' : 'Esta ficha no está guardada en el móvil. Ábrela una vez con conexión.'));
    if (pestana === 'datos') cuerpo.replaceChildren(...[vistaDatos(v, (fotos) => rejillaFotos(carpeta, fotos))].flat());
    if (pestana === 'vehiculos') cuerpo.replaceChildren(...[vistaVehiculos(v, (fotos) => rejillaFotos(carpeta, fotos))].flat());
    if (pestana === 'propiedades') cuerpo.replaceChildren(...[vistaPropiedades(v, (fotos) => rejillaFotos(carpeta, fotos))].flat());
    if (pestana === 'fotos') {
      const fotos = L.recogerFotos(v, CLAVES_FOTOS, NOMBRES_CAMPOS);
      cuerpo.replaceChildren(fotos.length ? rejillaFotos(carpeta, fotos) : h('p', { class: 'vacio' }, 'La ficha no tiene fotos.'));
    }
  }

  async function cargar() {
    if (!enLinea()) {
      estado(main, ficha ? `Sin conexión: ficha guardada el ${new Date(ficha.cuando).toLocaleString('es-ES')}.` : 'Sin conexión.', 'aviso');
      return;
    }
    try {
      const ops = await obtenerOps();
      let fichaId = ficha?.fichaId;
      if (!fichaId) {
        const f = await ops.buscarFicha(carpeta.driveId, carpeta.id, carpeta.numero);
        if (!f) { estado(main, 'Esta carpeta no tiene ficha JSON («Información ' + carpeta.numero + '.json»).', 'aviso'); return; }
        fichaId = f.id;
      }
      let leida;
      try { leida = await ops.leerFicha(carpeta.driveId, fichaId); } catch (e) {
        if (e.estado !== 404) throw e;
        const f = await ops.buscarFicha(carpeta.driveId, carpeta.id, carpeta.numero);
        if (!f) throw new Error('No se encuentra la ficha JSON.');
        fichaId = f.id;
        leida = await ops.leerFicha(carpeta.driveId, fichaId);
      }
      // En el móvil solo se guarda lo que la app enseña (sin contrato, cliente, informe…)
      ficha = { obj: { ...leida.obj, valores: minimizar(leida.obj.valores) }, fichaId, cuando: Date.now() };
      await cache.set('ficha:' + carpeta.id, ficha);
      estado(main, '');
      pintar();
    } catch (e) {
      if (e instanceof auth.SesionCaducada) { ultimoErrorSesion = true; actualizarChip(); }
      estado(main, (ficha ? 'Mostrando la copia guardada. ' : '') + 'No se pudo leer de OneDrive: ' + e.message, 'error');
    }
  }

  alSincronizar = (subidas) => { if (subidas) cargar(); else if (pestana === 'historial') pintar(); };
  elegir(pestana);
  cargar();
};

async function vistaHistorial(carpeta, valores) {
  const pend = (await pendientes.todos()).filter((p) => p.carpetaId === carpeta.id).sort((a, b) => b.creado - a.creado);
  const hist = Array.isArray(valores?.HISTORIAL) ? [...valores.HISTORIAL] : [];
  hist.sort((a, b) => L.ordenEntrada(b).localeCompare(L.ordenEntrada(a)));
  const tarjeta = (e, { pendiente, error } = {}) => h('article', { class: 'tarjeta entrada' + (pendiente ? ' pendiente' : '') },
    h('div', { class: 'cab' }, h('span', {}, `${e.FECHA} · ${e.HORA}`),
      pendiente ? h('span', { class: 'etiqueta' + (error ? ' error' : '') }, error ? 'Error al subir' : 'Pendiente de subir') : null),
    // Con GPS, el mapa va a las coordenadas exactas; sin GPS, a la dirección escrita
    e.GPS ? h('div', { class: 'lugar' }, e.LUGAR || 'GPS ' + e.GPS, ' ', linkMapa(e.GPS.replace(/\s/g, ''))) :
      e.LUGAR ? h('div', { class: 'lugar' }, lugarConMapa(e.LUGAR)) : null,
    h('div', { class: 'texto' }, e.TEXTO || ''),
    error ? h('p', { class: 'sub' }, error) : null);
  const out = [h('button', { class: 'boton ancho', onclick: () => ir('nuevaEntrada', { carpeta }) }, '＋ Nueva entrada')];
  out.push(h('p'));
  for (const p of pend) {
    const t = tarjeta(p.entrada, { pendiente: true, error: p.error });
    const locales = p.fotos.filter((f) => f.blob);
    if (locales.length) t.append(h('div', { class: 'rejilla' }, locales.map((f) => {
      const url = URL.createObjectURL(f.blob);
      return h('div', { class: 'mini', onclick: () => verFoto(url, f.pie) }, h('img', { src: url, alt: f.pie || f.nombre }));
    })));
    out.push(t);
  }
  for (const e of hist) {
    const t = tarjeta(e);
    if (Array.isArray(e.FOTOS) && e.FOTOS.length) t.append(rejillaFotos(carpeta, e.FOTOS));
    out.push(t);
  }
  if (!pend.length && !hist.length) out.push(h('p', { class: 'vacio' }, valores ? 'El historial está vacío.' : 'Historial no disponible todavía.'));
  return out;
}

function vistaPdf(carpeta) {
  const caja = h('div', {}, h('p', { class: 'vacio' }, enLinea() ? 'Buscando PDF…' : 'Hace falta conexión para abrir los PDF.'));
  if (!enLinea()) return caja;
  (async () => {
    const encontrados = [];
    const recorrer = async (id, ruta, nivel) => {
      for (const x of await graph.hijos(carpeta.driveId, id)) {
        if (x.folder && nivel < 3) await recorrer(x.id, ruta + x.name + '/', nivel + 1);
        else if (x.file && /\.pdf$/i.test(x.name)) encontrados.push({ ...x, ruta });
      }
    };
    try {
      await recorrer(carpeta.id, '', 0);
      encontrados.sort((a, b) => (b.lastModifiedDateTime || '').localeCompare(a.lastModifiedDateTime || ''));
      caja.replaceChildren(encontrados.length ? h('ul', { class: 'lista' }, encontrados.map((x) =>
        h('li', { onclick: () => window.open(x.webUrl, '_blank', 'noopener') },
          h('span', {}, '📄'),
          h('div', { class: 'crece' }, h('div', {}, x.name), h('div', { class: 'sub' }, (x.ruta || 'Carpeta principal') + ' · ' + new Date(x.lastModifiedDateTime).toLocaleDateString('es-ES')))))) :
        h('p', { class: 'vacio' }, 'No hay PDF en este expediente.'));
    } catch (e) {
      caja.replaceChildren(h('p', { class: 'estado error' }, e.message));
    }
  })();
  return caja;
}

// ---------------------------------------------------------------- nueva entrada
async function ubicacionActual() {
  const pos = await new Promise((ok, mal) => navigator.geolocation.getCurrentPosition(ok, mal, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }));
  const { latitude: la, longitude: lo, accuracy } = pos.coords;
  const gps = L.formatoGPS(la, lo);
  const autom = (await kv.get('direccionAuto')) ?? true;
  if (autom && enLinea()) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat=${la}&lon=${lo}`, { referrerPolicy: 'origin' });
      const j = await r.json();
      const a = j.address || {};
      const calle = [a.road || a.pedestrian || a.footway || a.square, a.house_number].filter(Boolean).join(' ');
      const sitio = a.city || a.town || a.village || a.municipality || a.county || '';
      const texto = [calle || a.neighbourhood || a.suburb, sitio].filter(Boolean).join(', ');
      if (texto) return { texto, gps, accuracy };
    } catch { /* sin dirección: el lugar lo escribe el usuario */ }
  }
  return { texto: '', gps, accuracy };
}

function extension(file) {
  const m = (file.name || '').match(/\.(\w{2,5})$/);
  if (m) return m[1].toLowerCase();
  return ({ 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' })[file.type] || 'jpg';
}

vistas.nuevaEntrada = async ({ carpeta }) => {
  const ahora = new Date();
  const fotos = [];
  const main = pantalla('Nueva entrada', { atras: true });
  const fecha = h('input', { inputMode: 'numeric', value: L.fechaES(ahora), placeholder: 'dd/mm/aaaa' });
  const hora = h('input', { inputMode: 'numeric', value: L.horaES(ahora), placeholder: 'hh:mm' });
  const lugar = h('input', { placeholder: 'Calle, número, localidad' });
  const notaGps = h('div', { class: 'sub' });
  let gpsActual = null; // coordenadas de esta entrada (se guardan aparte, en GPS)
  const texto = h('textarea', { placeholder: 'Qué ha pasado…' });
  const rejilla = h('div', { class: 'rejilla grande' });
  const camara = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  const galeria = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const guardar = h('button', { class: 'boton ancho' }, 'Guardar entrada');

  const gps = async () => {
    notaGps.textContent = 'Buscando ubicación…';
    try {
      const u = await ubicacionActual();
      gpsActual = u.gps;
      if (u.texto && (!lugar.value.trim() || lugar.dataset.auto === '1')) { lugar.value = u.texto; lugar.dataset.auto = '1'; }
      notaGps.replaceChildren(
        `GPS: ${u.gps} (precisión aprox. ${Math.round(u.accuracy)} m). `,
        u.texto ? 'Puedes corregir la dirección. ' : 'Escribe el lugar; las coordenadas se guardan aparte. ',
        h('button', { type: 'button', class: 'enlace', onclick: () => { gpsActual = null; notaGps.textContent = 'Sin coordenadas GPS en esta entrada.'; } }, 'Quitar GPS'));
    } catch (e) {
      gpsActual = null;
      notaGps.textContent = e.code === 1 ? 'Sin permiso de ubicación. Escribe el lugar a mano.' : 'No se pudo obtener la ubicación. Escribe el lugar a mano.';
    }
  };
  lugar.addEventListener('input', () => { lugar.dataset.auto = '0'; });

  const pintarFotos = () => rejilla.replaceChildren(...fotos.map((f, i) => h('div', {},
    h('div', { class: 'mini' }, h('img', { src: f.url, alt: '' }),
      h('button', { class: 'quitar', type: 'button', 'aria-label': 'Quitar foto', onclick: () => { URL.revokeObjectURL(f.url); fotos.splice(i, 1); pintarFotos(); } }, '✕')),
    h('input', { placeholder: 'Pie (opcional)', value: f.pie, oninput: (e) => { f.pie = e.target.value; } }))));
  const añadir = (lista) => {
    for (const file of lista) {
      const d = new Date();
      const nombre = L.nombreFotoMovil(d).replace(/\.jpg$/, '.' + extension(file));
      fotos.push({ nombre, blob: file, pie: '', url: URL.createObjectURL(file) });
    }
    pintarFotos();
  };
  camara.addEventListener('change', () => { añadir(camara.files); camara.value = ''; });
  galeria.addEventListener('change', () => { añadir(galeria.files); galeria.value = ''; });

  antesDeSalir = () => (!texto.value.trim() && !fotos.length) || confirm('¿Salir sin guardar esta entrada?');

  guardar.addEventListener('click', async () => {
    const F = fecha.value.trim(), Hh = hora.value.trim();
    if (!L.esFechaES(F)) return estado(main, 'La fecha debe ser dd/mm/aaaa.', 'error');
    if (!L.esHoraES(Hh)) return estado(main, 'La hora debe ser hh:mm.', 'error');
    if (!texto.value.trim()) return estado(main, 'Escribe una descripción.', 'error');
    guardar.disabled = true;
    const cacheFicha = await cache.get('ficha:' + carpeta.id);
    await pendientes.guardar({
      id: crypto.randomUUID(), creado: Date.now(), fase: 'fotos',
      driveId: carpeta.driveId, carpetaId: carpeta.id, numero: carpeta.numero, investigado: carpeta.investigado,
      fichaId: cacheFicha?.fichaId || null,
      expNumero: String(cacheFicha?.obj?.valores?.EXP_NUMERO ?? '').trim() || null,
      entrada: { FECHA: F, HORA: Hh, LUGAR: lugar.value.trim(), ...(gpsActual ? { GPS: gpsActual } : {}), TEXTO: texto.value.trim() },
      fotos: fotos.map((f) => ({ nombre: f.nombre, blob: f.blob, pie: f.pie.trim() })),
    });
    fotos.forEach((f) => URL.revokeObjectURL(f.url));
    antesDeSalir = null;
    history.back();
    setTimeout(sincronizar, 300);
  });

  main.append(
    h('div', { class: 'fila2' }, h('div', {}, h('label', {}, 'Fecha'), fecha), h('div', {}, h('label', {}, 'Hora'), hora)),
    h('label', {}, 'Lugar'), lugar,
    h('div', { class: 'botones' }, h('button', { class: 'boton sec', type: 'button', onclick: gps }, '📍 Ubicación actual')),
    notaGps, h('p'),
    h('label', {}, 'Descripción'), texto,
    h('label', {}, 'Fotos'),
    h('div', { class: 'botones' },
      h('button', { class: 'boton sec', type: 'button', onclick: () => camara.click() }, '📷 Cámara'),
      h('button', { class: 'boton sec', type: 'button', onclick: () => galeria.click() }, '🖼 Galería')),
    camara, galeria, rejilla, h('p'),
    guardar,
    h('p', { class: 'sub' }, enLinea() ? 'Se subirá a OneDrive al guardar.' : 'Sin conexión: se guarda en el móvil y se subirá sola cuando vuelva la cobertura.'));
  gps();
};

// ---------------------------------------------------------------- ajustes
vistas.ajustes = async () => {
  const main = pantalla('Ajustes', { atras: true });
  const raiz = await kv.get('raiz');
  const usuario = (await kv.get('usuario')) || '—';
  const n = await pendientes.contar();
  const huellaPosible = await B.huellaDisponible();
  const conHuella = await B.tieneHuella();
  const dirAuto = (await kv.get('direccionAuto')) ?? true;

  const interruptor = (texto, valor, cambiar, ayuda) => {
    const c = h('input', { type: 'checkbox', checked: valor, onchange: async (e) => { try { await cambiar(e.target.checked); } catch { e.target.checked = !e.target.checked; } } });
    return h('div', {}, h('label', { class: 'interruptor' }, h('span', {}, texto), c), ayuda ? h('p', { class: 'sub' }, ayuda) : null);
  };

  main.append(
    h('section', { class: 'tarjeta' }, h('h3', {}, 'Cuenta'), h('p', {}, usuario)),
    h('section', { class: 'tarjeta' }, h('h3', {}, 'Carpeta de expedientes'),
      h('p', {}, raiz?.ruta || raiz?.name || '—'),
      h('button', { class: 'boton sec', onclick: () => ir('elegirRaiz') }, 'Cambiar carpeta')),
    h('section', { class: 'tarjeta' }, h('h3', {}, 'Entradas pendientes'),
      h('p', {}, n ? `${n} entrada(s) esperando a subir.` : 'Todo está subido.'),
      n ? h('button', { class: 'boton sec', onclick: () => { sincronizar(); history.back(); } }, 'Subir ahora') : null),
    h('section', { class: 'tarjeta' }, h('h3', {}, 'Seguridad'),
      h('div', { class: 'botones' }, h('button', { class: 'boton sec', onclick: () => ir('cambiarPin') }, 'Cambiar PIN')),
      huellaPosible ? interruptor('Abrir con huella', conHuella, (v) => (v ? B.activarHuella() : B.desactivarHuella())) : h('p', { class: 'sub' }, 'Este móvil no permite huella en apps web.')),
    h('section', { class: 'tarjeta' }, h('h3', {}, 'Ubicación'),
      interruptor('Convertir GPS en dirección', dirAuto, (v) => kv.set('direccionAuto', v),
        'Usa OpenStreetMap: se envían solo las coordenadas, sin ningún dato del expediente. Las coordenadas se guardan siempre aparte (dato GPS); si lo desactivas, tú escribes el lugar.')),
    h('section', { class: 'tarjeta' }, h('h3', {}, 'Cerrar sesión'),
      h('p', { class: 'sub' }, 'Borra del móvil todo lo guardado por la app (lista, fichas, PIN). No borra nada de OneDrive.'),
      h('button', { class: 'boton peligro ancho', onclick: cerrarSesion }, 'Cerrar sesión y borrar datos del móvil')),
    h('p', { class: 'sub centro' }, `Aletheia Campo ${VERSION_APP}`));
};
vistas.cambiarPin = () => pantallaPin({ cambiar: true });

async function cerrarSesion() {
  const n = await pendientes.contar();
  if (n && !confirm(`ATENCIÓN: hay ${n} entrada(s) que todavía NO se han subido a OneDrive y se perderán.\n\n¿Cerrar sesión de todas formas?`)) return;
  if (!n && !confirm('¿Cerrar sesión y borrar los datos guardados en este móvil?')) return;
  await borrarTodo();
  location.replace(`https://login.microsoftonline.com/${CONFIG.TENANT}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(auth.urlRetorno())}`);
}

iniciar();
