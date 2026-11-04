// Pruebas con DATOS INVENTADOS. Ejecutar:  node pruebas/prueba.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../js/logica.js';
import { crearOperaciones } from '../js/operaciones.js';

let ok = 0;
const prueba = async (nombre, fn) => { await fn(); ok++; console.log('  ✔', nombre); };

// ---------- Ficha inventada ----------
const fichaBase = () => ({
  programa: 'Generador de Fichas', version: '5.6', guardado: '2026-11-03T19:08:00',
  valores: {
    EXP_NUMERO: '0440', NOMBRE: 'Ana', APELLIDOS: 'Ejemplo Ficticia',
    DOMICILIO: 'Rúa Inventada 12, 36201 Vigo',
    HISTORIAL: [
      { FECHA: '03/11/2026', HORA: '10:15', LUGAR: 'C/ Inventada 12, Vigo', TEXTO: 'Sale del domicilio.', FOTOS: [] },
    ],
    DETALLE_VEHICULOS: [{ MARCA: 'Marca X', MODELO: 'Modelo Y', MATRICULA: '0000XXX', FOTOS: [{ ruta: 'Imagenes/coche.jpg', pie: '' }] }],
    FOTO_PRINCIPAL: 'C:\\Fotos\\otra.jpg',
    NOTA: 'Emoji 🚗 y comillas "dobles"\ny salto',
  },
});

console.log('Lógica:');
await prueba('lee el nombre de carpeta', () => {
  assert.deepEqual(L.leerNombreCarpeta('0440 - EDP0150 - Ana Ejemplo'), { numero: '0440', edp: 'EDP0150', investigado: 'Ana Ejemplo' });
  assert.equal(L.leerNombreCarpeta('Plantillas'), null);
});
await prueba('reconoce el nombre de la ficha (ó compuesta o no)', () => {
  assert.ok(L.esNombreFicha('Información 0440.json', '440'));
  assert.ok(L.esNombreFicha('Informacio\u0301n 0440.json', '0440'));
  assert.ok(!L.esNombreFicha('Información 0441.json', '0440'));
});
await prueba('fusión: añade solo lo nuevo y no toca el resto', () => {
  const f = fichaBase();
  const nueva = { FECHA: '04/11/2026', HORA: '09:00', LUGAR: 'Praza Ficticia', TEXTO: 'Llega al trabajo.', FOTOS: [] };
  const repetida = { ...f.valores.HISTORIAL[0] };
  const { ficha, añadidas } = L.fusionarHistorial(f, [repetida, nueva, nueva]);
  assert.equal(añadidas, 1);
  assert.equal(ficha.valores.HISTORIAL.length, 2);
  assert.deepEqual({ ...ficha, valores: { ...ficha.valores, HISTORIAL: null } }, { ...f, valores: { ...f.valores, HISTORIAL: null } });
  assert.equal(f.valores.HISTORIAL.length, 1, 'el original no se modifica');
});
await prueba('rechaza JSON que no son fichas del programa', () => {
  assert.throws(() => L.fusionarHistorial({ programa: 'Otro', valores: {} }, []));
});
await prueba('recoge fotos de toda la ficha', () => {
  const fotos = L.recogerFotos(fichaBase().valores).map((x) => x.ruta);
  assert.deepEqual(fotos.sort(), ['C:\\Fotos\\otra.jpg', 'Imagenes/coche.jpg'].sort());
});

// Comparación con Python real
for (const [indent, ascii] of [[2, true], [4, false], [null, true], [null, false]]) {
  await prueba(`JSON idéntico al de Python (indent=${indent}, ensure_ascii=${ascii})`, () => {
    const py = execFileSync('python3', ['-c',
      `import json,sys; d=json.loads(sys.stdin.read()); sys.stdout.write(json.dumps(d, indent=${indent ?? 'None'}, ensure_ascii=${ascii ? 'True' : 'False'}))`],
    { input: JSON.stringify(fichaBase()) }).toString('utf8');
    assert.equal(L.jsonComoPython(fichaBase(), { sangria: indent ? ' '.repeat(indent) : null, ascii }), py);
  });
}
await prueba('leer + escribir sin cambios = mismos bytes', () => {
  for (const est of [{ bom: true, sangria: '  ', ascii: false, crlf: true, finalNL: true }, { bom: false, sangria: '    ', ascii: true, crlf: false, finalNL: false }]) {
    const b = L.escribirFichaBytes(fichaBase(), est);
    const { obj, estilo } = L.leerFichaBytes(b);
    assert.deepEqual(Buffer.from(L.escribirFichaBytes(obj, estilo)), Buffer.from(b));
  }
});
await prueba('nombre del registro como el PC (0440, 99999)', () => {
  assert.equal(L.nombreRegistro('0440'), 'Registro de actividad 0440.txt');
  assert.equal(L.nombreRegistro('99999'), 'Registro de actividad 99999.txt');
  assert.equal(L.nombreRegistro('440'), 'Registro de actividad 0440.txt');
});
await prueba('registro: igual que el del PC al crearlo; solo añade al final', () => {
  const l1 = L.lineaRegistro({ fecha: '04/11/2026', hora: '09:00:00', ordenador: 'Móvil', usuario: 'Usuario Prueba', accion: 'Prueba', detalle: 'con\ttab' });
  const a = L.anexarRegistro(null, [l1]);
  assert.equal(new TextDecoder().decode(a), 'Fecha\tHora\tOrdenador\tUsuario\tAcción\tDetalle\r\n04/11/2026\t09:00:00\tMóvil\tUsuario Prueba\tPrueba\tcon tab\r\n');
  assert.notEqual(a[0], 0xef, 'sin BOM, como el archivo real del PC');
  const sinFin = new TextEncoder().encode('\ufeffFecha\tHora\r\nlinea vieja');
  const b = L.anexarRegistro(sinFin, [l1]);
  assert.deepEqual(Buffer.from(b.slice(0, sinFin.length)), Buffer.from(sinFin));
  const t = new TextDecoder().decode(b);
  assert.ok(t.endsWith('linea vieja\r\n04/11/2026\t09:00:00\tMóvil\tUsuario Prueba\tPrueba\tcon tab\r\n'));
});

// ---------- OneDrive simulado ----------
function oneDriveFalso() {
  const archivos = new Map(); // ruta -> {id, bytes, eTag, size}
  let n = 0, borrados = 0;
  const carpeta = '0440 - EDP0150 - Ana Ejemplo';
  const poner = (ruta, bytes) => {
    const prev = archivos.get(ruta);
    const it = { id: prev?.id || 'id' + ++n, name: ruta.split('/').pop(), bytes, size: bytes.length, eTag: 'e' + ++n, file: {} };
    archivos.set(ruta, it); return it;
  };
  const porId = (id) => [...archivos.entries()].find(([, v]) => v.id === id);
  const g = {
    antesDeGuardar: null, // para simular que el PC guarda entre medias
    hijos: async () => [...archivos.entries()].filter(([r]) => !r.includes('/')).map(([, v]) => v),
    item: async (_d, id) => ({ ...porId(id)[1] }),
    itemPorRuta: async (_d, _c, rel) => (archivos.has(rel) ? { ...archivos.get(rel) } : null),
    bytes: async (it) => porId(it.id)[1].bytes,
    reemplazarSiNoCambio: async (_d, id, eTag, contenido) => {
      if (g.antesDeGuardar) { const f = g.antesDeGuardar; g.antesDeGuardar = null; await f(); }
      const [ruta, it] = porId(id);
      if (it.eTag !== eTag) { const e = new Error('412'); e.estado = 412; throw e; }
      return poner(ruta, contenido instanceof Uint8Array ? contenido : new Uint8Array(await contenido.arrayBuffer()));
    },
    crearNuevo: async (_d, _c, rel, contenido) => {
      if (archivos.has(rel)) { const e = new Error('409'); e.estado = 409; throw e; }
      return poner(rel, contenido instanceof Uint8Array ? contenido : new Uint8Array(await contenido.arrayBuffer()));
    },
  };
  return { g, archivos, poner, carpeta, borrados: () => borrados };
}

console.log('OneDrive simulado:');
const estiloPC = { bom: false, sangria: '    ', ascii: false, crlf: false, finalNL: false };

await prueba('el PC guarda mientras el móvil fusiona → se reintenta y no se pierde nada', async () => {
  const od = oneDriveFalso();
  const fichaIt = od.poner('Información 0440.json', L.escribirFichaBytes(fichaBase(), estiloPC));
  const op = crearOperaciones(od.g, { ordenador: 'Móvil', usuario: 'Usuario Prueba' });
  od.g.antesDeGuardar = async () => {
    const f = fichaBase();
    f.valores.TELEFONO = '600000000';
    f.valores.HISTORIAL.push({ FECHA: '04/11/2026', HORA: '08:00', LUGAR: '', TEXTO: 'Entrada del PC', FOTOS: [] });
    od.poner('Información 0440.json', L.escribirFichaBytes(f, estiloPC));
  };
  const r = await op.añadirAlHistorial('d', fichaIt.id, [{ FECHA: '04/11/2026', HORA: '09:30', LUGAR: 'Lugar inventado', TEXTO: 'Entrada del móvil', FOTOS: [] }]);
  assert.deepEqual(r, { añadidas: 1, expNumero: '0440' });
  const { obj, estilo } = L.leerFichaBytes(od.archivos.get('Información 0440.json').bytes);
  assert.equal(obj.valores.TELEFONO, '600000000', 'se conserva el cambio del PC');
  assert.deepEqual(obj.valores.HISTORIAL.map((e) => e.TEXTO), ['Sale del domicilio.', 'Entrada del PC', 'Entrada del móvil']);
  assert.equal(estilo.sangria, '    ');
});

await prueba('pendiente completo: foto + entrada + registro, y repetir no duplica', async () => {
  const od = oneDriveFalso();
  od.poner('Información 0440.json', L.escribirFichaBytes(fichaBase(), estiloPC));
  const op = crearOperaciones(od.g, { ordenador: 'Móvil', usuario: 'Usuario Prueba' });
  const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' });
  const p = { id: 'p1', driveId: 'd', carpetaId: 'c', numero: '0440', fichaId: null, fase: 'fotos',
    entrada: { FECHA: '04/11/2026', HORA: '11:45', LUGAR: 'Calle Ficticia 3, Vigo', TEXTO: 'Vehículo aparcado.' },
    fotos: [{ nombre: 'MOVIL_20261104_114500_abcd.jpg', blob, pie: 'Coche' }] };
  await op.procesarPendiente(p, async () => {});
  // Simula un corte justo antes de borrar de la cola: se vuelve a procesar
  const p2 = { ...p, id: 'p1', fichaId: null, fase: 'fotos', fotos: [{ nombre: 'MOVIL_20261104_114500_abcd.jpg', blob, pie: 'Coche' }] };
  await op.procesarPendiente(p2, async () => {});
  const { obj } = L.leerFichaBytes(od.archivos.get('Información 0440.json').bytes);
  assert.equal(obj.valores.HISTORIAL.length, 2, 'no se duplica');
  assert.deepEqual(obj.valores.HISTORIAL[1].FOTOS, [{ ruta: 'Imagenes/Aportaciones/MOVIL_20261104_114500_abcd.jpg', pie: 'Coche' }]);
  assert.ok(od.archivos.has('Imagenes/Aportaciones/MOVIL_20261104_114500_abcd.jpg'));
  assert.equal([...od.archivos.keys()].filter((k) => k.includes('MOVIL')).length, 1, 'la foto no se sube dos veces');
  const reg = new TextDecoder('utf-8', { ignoreBOM: true }).decode(od.archivos.get('Registro de actividad 0440.txt').bytes);
  assert.ok(reg.startsWith('Fecha\tHora\tOrdenador\tUsuario\tAcción\tDetalle\r\n'));
  assert.equal(reg.split('\r\n').filter((l) => l.includes('\tMóvil\t')).length, 4);
  assert.ok(reg.includes('ya existente (no se duplica)'));
});

await prueba('una foto distinta con el mismo nombre no se sobrescribe', async () => {
  const od = oneDriveFalso();
  od.poner('Imagenes/Aportaciones/X.jpg', new Uint8Array([9]));
  const op = crearOperaciones(od.g, { ordenador: 'Móvil', usuario: 'U' });
  const r = await op.subirFoto('d', 'c', 'X.jpg', new Blob([new Uint8Array([1, 2])]));
  assert.equal(r, 'Imagenes/Aportaciones/X_2.jpg');
  assert.deepEqual([...od.archivos.get('Imagenes/Aportaciones/X.jpg').bytes], [9]);
});

console.log(`\n${ok} pruebas superadas.`);
