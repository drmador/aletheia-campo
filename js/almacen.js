// ============================================================
//  ALMACÉN LOCAL DEL MÓVIL (IndexedDB)
//  - kv:          ajustes, sesión de Microsoft, PIN
//  - pendientes:  entradas del historial que aún no han subido
//  - cache:       directorio y fichas consultadas (para usar sin cobertura)
//  Todo se borra al cerrar sesión.
// ============================================================
const NOMBRE_BD = 'aletheia-campo';
const VERSION_BD = 1;
let bdPromesa = null;

function abrir() {
  if (bdPromesa) return bdPromesa;
  bdPromesa = new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE_BD, VERSION_BD);
    r.onupgradeneeded = () => {
      const bd = r.result;
      if (!bd.objectStoreNames.contains('kv')) bd.createObjectStore('kv');
      if (!bd.objectStoreNames.contains('cache')) bd.createObjectStore('cache');
      if (!bd.objectStoreNames.contains('pendientes')) bd.createObjectStore('pendientes', { keyPath: 'id' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
  return bdPromesa;
}

async function tx(almacen, modo, fn) {
  const bd = await abrir();
  return new Promise((ok, mal) => {
    const t = bd.transaction(almacen, modo);
    const s = t.objectStore(almacen);
    let res;
    const r = fn(s);
    if (r) r.onsuccess = () => { res = r.result; };
    t.oncomplete = () => ok(res);
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error);
  });
}

export const kv = {
  get: (k) => tx('kv', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
  del: (k) => tx('kv', 'readwrite', (s) => s.delete(k)),
};

export const cache = {
  get: (k) => tx('cache', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('cache', 'readwrite', (s) => s.put(v, k)),
};

export const pendientes = {
  todos: () => tx('pendientes', 'readonly', (s) => s.getAll()),
  get: (id) => tx('pendientes', 'readonly', (s) => s.get(id)),
  guardar: (p) => tx('pendientes', 'readwrite', (s) => s.put(p)),
  quitar: (id) => tx('pendientes', 'readwrite', (s) => s.delete(id)),
  contar: () => tx('pendientes', 'readonly', (s) => s.count()),
};

/** Borra TODO lo guardado en el móvil (al cerrar sesión). */
export async function borrarTodo() {
  try {
    const bd = await abrir();
    bd.close();
  } catch { /* nada */ }
  bdPromesa = null;
  await new Promise((ok) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = () => ok();
  });
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* nada */ }
  if (self.caches) {
    for (const n of await caches.keys()) if (n.startsWith('datos-')) await caches.delete(n);
  }
}
