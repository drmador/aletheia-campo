# Prueba completa en navegador con OneDrive SIMULADO y datos INVENTADOS.
#   python3 pruebas/prueba_navegador.py
import base64, json, re, sys, threading, http.server, functools, os, io
from urllib.parse import urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPTURAS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'pruebas', 'capturas')
os.makedirs(CAPTURAS, exist_ok=True)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

ficha = lambda num, nombre, apell, extra: {"programa": "Generador de Fichas", "version": "5.6", "guardado": "2026-11-03T19:08:00",
  "valores": {"EXP_NUMERO": num, "EXP_EDP": "EDP0150", "NOMBRE": nombre, "APELLIDOS": apell, "DNI_NIE": "00000000T", "FECHA_NAC": "01/01/1980", "EDAD": "46",
    "FOTO_INVESTIGADO": "Imagenes/Aportaciones/foto1.jpg",
    "DIRECCION_1": "Rúa Inventada 12, 3º", "POBLACION_1": "Vigo", "PROVINCIA_1": "Pontevedra",
    "TELEFONO_1": "600 000 000", "EMAIL": "ficticio@example.com", "TRABAJO_EMPRESA": "Empresa Imaginaria S.L.", "TRABAJO_DIRECCION": "Polígono Ficticio, nave 3, Vigo",
    "JUDICIALIZADO": "No", "CLIENTE_NOMBRE": "Cliente Secreto", "CLIENTE_DNI": "11111111H", "INFORME_PDF_CLAVE": "clave-inventada",
    "HISTORIAL": [{"FECHA": "03/11/2026", "HORA": "10:15", "LUGAR": "C/ Inventada 12, Vigo", "TEXTO": "Sale del domicilio a pie.",
                   "FOTOS": [{"ruta": "Imagenes/Aportaciones/foto1.jpg", "pie": "Salida"}]}],
    "DETALLE_VEHICULOS": [{"MARCA": "Marca X", "MODELO": "Modelo Y", "MATRICULA": "0000XXX", "COLOR": "Gris", "TITULAR": "Persona Inventada", "ITV": "Vigente", "SEGURO": "Aseguradora Ficticia", "DOMICILIO": "Rúa Inventada 12, Vigo", "FOTOS": []}],
    "PROPIEDADES": [{"SITUACION": "Vigente", "NATURALEZA": "Vivienda", "UBICACION": "Redondela (Pontevedra)", "CRU": "00000000000000", "FOTOS": []}],
    "PROPIEDADES_RESUMEN": "Una vivienda a su nombre (datos inventados).", **extra}}

archivos = {}   # ruta -> bytes ;  carpetas: conjunto de rutas
carpetas = {''}
etags = {}
def pon(ruta, datos):
    archivos[ruta] = datos; etags[ruta] = etags.get(ruta, 0) + 1
    partes = ruta.split('/')
    for i in range(1, len(partes)): carpetas.add('/'.join(partes[:i]))
E = 'Expedientes'
pon(f'{E}/0440 - EDP0150 - Ana Ejemplo/Información 0440.json', json.dumps(ficha('0440', 'Ana', 'Ejemplo Ficticia', {}), indent=4, ensure_ascii=False).encode())
pon(f'{E}/0440 - EDP0150 - Ana Ejemplo/Imagenes/Aportaciones/foto1.jpg', PNG)
pon(f'{E}/0440 - EDP0150 - Ana Ejemplo/Documentos/Informe inventado.pdf', b'%PDF-1.4')
pon(f'{E}/0441 - EDP0151 - Bruno Inventado/Información 0441.json', json.dumps(ficha('0441', 'Bruno', 'Inventado', {}), indent=4, ensure_ascii=False).encode())
carpetas.add('Plantillas'); carpetas.add(f'{E}/0442 - EDP0152 - Carla Supuesta')

padre = lambda r: r.rsplit('/', 1)[0] if '/' in r else ''
todos = lambda: [r for r in list(archivos) + list(carpetas) if r]
idde = lambda ruta: 'ROOT' if ruta == '' else 'i' + base64.urlsafe_b64encode(ruta.encode()).decode().rstrip('=')
def rutade(i):
    if i == 'ROOT': return ''
    s = i[1:]; return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4)).decode()
def item(ruta):
    nombre = ruta.split('/')[-1] if ruta else 'root'
    d = {"id": idde(ruta), "name": nombre, "parentReference": {"driveId": "D1"}, "webUrl": "https://onedrive.example/" + idde(ruta),
         "lastModifiedDateTime": "2026-11-03T10:00:00Z"}
    if ruta in archivos:
        d.update(file={}, size=len(archivos[ruta]), eTag=f'"{idde(ruta)},{etags[ruta]}"', **{"@microsoft.graph.downloadUrl": "https://descarga.example/" + idde(ruta)})
    else:
        d.update(folder={"childCount": len({r for r in todos() if padre(r) == ruta})}, eTag='"f"')
    return d

def graph(route):
    req = route.request
    u = urlparse(req.url); p = unquote(u.path).replace('/v1.0', '', 1); q = parse_qs(u.query)
    ok = lambda obj, st=200: route.fulfill(status=st, content_type='application/json', body=json.dumps(obj), headers={'Access-Control-Allow-Origin': '*'})
    err = lambda st, msg: ok({"error": {"code": str(st), "message": msg}}, st)
    if p == '/me': return ok({"displayName": "Usuario Prueba", "userPrincipalName": "prueba@example.com"})
    if p == '/me/drive/root': return ok(item(''))
    m = re.match(r'^/drives/D1/items/([^/:]+)(?::/(.*?))?(?::)?(/children|/content|/thumbnails)?$', p)
    if not m: return err(400, 'ruta no simulada ' + p)
    base, rel, sufijo = rutade(m.group(1)), m.group(2), m.group(3)
    ruta = (base + '/' + rel if base else rel) if rel else base
    ruta = ruta.rstrip('/')
    if req.method == 'GET':
        if sufijo == '/children':
            hijos = sorted({r for r in todos() if padre(r) == ruta})
            return ok({"value": [item(r) for r in hijos]})
        if sufijo == '/thumbnails': return ok({"value": [{"large": {"url": "https://miniatura.example/" + idde(ruta)}}]})
        if ruta in archivos or ruta in carpetas: return ok(item(ruta))
        return err(404, 'No existe')
    if req.method == 'PUT' and sufijo == '/content':
        cuerpo = req.post_data_buffer
        if rel is None:  # reemplazo por id
            if req.headers.get('if-match') != item(ruta)['eTag']: return err(412, 'eTag no coincide')
            pon(ruta, cuerpo); return ok(item(ruta))
        if q.get('@microsoft.graph.conflictBehavior') == ['fail'] and ruta in archivos: return err(409, 'Ya existe')
        pon(ruta, cuerpo); return ok(item(ruta), 201)
    if req.method == 'DELETE': BORRADOS.append(ruta); return err(405, 'no')
    return err(400, 'no simulado')
BORRADOS = []

class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Silencioso, directory=RAIZ))
threading.Thread(target=srv.serve_forever, daemon=True).start()

errores = []
with sync_playwright() as pw:
    nav = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = nav.new_context(viewport={'width': 400, 'height': 820}, device_scale_factor=2, geolocation={'latitude': 42.2406, 'longitude': -8.7207},
                          permissions=['geolocation'], locale='es-ES', service_workers='block', bypass_csp=True)
    pag = ctx.new_page()
    pag.on('pageerror', lambda e: errores.append(str(e)))
    pag.on('console', lambda m: m.type == 'error' and '404 (Not Found)' not in m.text and errores.append(m.text))
    ctx.route('**/js/config.js', lambda r: r.fulfill(content_type='text/javascript', body=open(os.path.join(RAIZ, 'js/config.js')).read().replace('PEGAR_AQUI_EL_ID_DE_CLIENTE', '00000000-0000-0000-0000-000000000000')))
    def autorizar(r):
        q = parse_qs(urlparse(r.request.url).query)
        r.fulfill(status=302, headers={'Location': f"{q['redirect_uri'][0]}?code=CODIGO&state={q['state'][0]}"})
    ctx.route('https://login.microsoftonline.com/**/authorize*', autorizar)
    ctx.route('https://login.microsoftonline.com/**/token', lambda r: r.fulfill(content_type='application/json', headers={'Access-Control-Allow-Origin': '*'},
              body=json.dumps({"access_token": "TOKEN", "refresh_token": "RT", "expires_in": 3600})))
    ctx.route('https://graph.microsoft.com/**', graph)
    ctx.route('https://descarga.example/**', lambda r: r.fulfill(body=archivos[rutade(urlparse(r.request.url).path[1:])], headers={'Access-Control-Allow-Origin': '*'}))
    ctx.route('https://miniatura.example/**', lambda r: r.fulfill(body=PNG, content_type='image/png'))
    ctx.route('https://nominatim.openstreetmap.org/**', lambda r: r.fulfill(content_type='application/json', headers={'Access-Control-Allow-Origin': '*'},
              body=json.dumps({"address": {"road": "Rúa Ficticia", "house_number": "7", "city": "Vigo"}})))

    foto = lambda n: pag.screenshot(path=os.path.join(CAPTURAS, n))
    pag.goto('http://127.0.0.1:8765/')
    pag.get_by_text('Entrar con mi cuenta de Microsoft').click()
    pag.get_by_text('Elige un PIN').wait_for()
    foto('1-pin.png')
    for _ in range(2):
        for d in '1357': pag.locator('.teclado button', has_text=d).click()
        pag.locator('.teclado button', has_text='✓').click()
    pag.get_by_text('Mi OneDrive').wait_for()
    pag.get_by_text('Expedientes', exact=True).click()
    pag.get_by_text('Contiene 3 carpetas de expediente.').wait_for()
    pag.get_by_text('Usar esta carpeta').click()
    pag.get_by_text('Ana Ejemplo').wait_for()
    foto('2-directorio.png')
    pag.fill('input[type=search]', 'bruno')
    assert pag.locator('.lista li').count() == 1
    pag.fill('input[type=search]', '')
    pag.get_by_text('Ana Ejemplo').click()
    pag.get_by_text('Sale del domicilio a pie.').wait_for()
    pag.wait_for_selector('.mini img')
    foto('3-historial.png')
    pag.get_by_role('tab', name='Datos').click(); pag.get_by_text('Empresa Imaginaria S.L.').wait_for(); pag.wait_for_selector('.foto-cabecera img'); foto('4-datos.png')
    assert pag.get_by_text('Vigo (Pontevedra)').count() == 1, 'población y provincia junto a la dirección'
    assert 'Cliente Secreto' not in pag.inner_text('main') and 'clave-inventada' not in pag.inner_text('main')
    enlace = pag.locator('a.mapa').first.get_attribute('href'); assert 'Pontevedra' in enlace and 'Espa' in enlace, enlace
    guardado = pag.evaluate('''() => new Promise(ok => { const r = indexedDB.open('aletheia-campo'); r.onsuccess = () => { const g = r.result.transaction('cache').objectStore('cache').getAll(); g.onsuccess = () => ok(JSON.stringify(g.result)); }; })''')
    assert 'Cliente Secreto' not in guardado and 'clave-inventada' not in guardado and 'Rúa Inventada 12, 3º' in guardado, 'en el móvil solo lo necesario'
    assert pag.locator('a[href^="https://www.google.com/maps"]').count() >= 1
    pag.get_by_role('tab', name='Vehículos').click(); pag.get_by_text('0000XXX').wait_for(); foto('5-vehiculos.png')
    pag.get_by_role('tab', name='Propiedades').click(); pag.get_by_text('CRU / IDUFIR').wait_for(); foto('5b-propiedades.png')
    pag.get_by_role('tab', name='PDF').click(); pag.get_by_text('Informe inventado.pdf').wait_for()
    pag.get_by_role('tab', name='Historial').click()

    # --- Entrada SIN cobertura ---
    ctx.set_offline(True)
    pag.get_by_text('＋ Nueva entrada').click()
    pag.wait_for_function("document.querySelector('main input[placeholder^=\"Calle\"]').value.startsWith('GPS')")
    pag.fill('main input[placeholder^="Calle"]', 'Praza Inventada 3, Vigo')
    pag.fill('textarea', 'Entra en un bar (entrada de prueba sin cobertura).')
    pag.set_input_files('input[type=file][multiple]', files=[{'name': 'campo.jpg', 'mimeType': 'image/jpeg', 'buffer': PNG}])
    pag.fill('.rejilla input', 'Fachada del bar')
    foto('6-nueva-entrada.png')
    pag.get_by_text('Guardar entrada').click()
    pag.get_by_text('Pendiente de subir').wait_for()
    foto('7-pendiente.png')
    json_ruta = f'{E}/0440 - EDP0150 - Ana Ejemplo/Información 0440.json'
    assert len(json.loads(archivos[json_ruta])['valores']['HISTORIAL']) == 1, 'sin red no debe subir'

    # El PC guarda la ficha mientras tanto (añade un teléfono y una entrada suya)
    f = json.loads(archivos[json_ruta]); f['valores']['TELEFONO_2'] = '611 111 111'
    f['valores']['HISTORIAL'].append({"FECHA": "04/11/2026", "HORA": "12:00", "LUGAR": "", "TEXTO": "Entrada escrita en el PC", "FOTOS": []})
    pon(json_ruta, json.dumps(f, indent=4, ensure_ascii=False).encode())

    # --- Vuelve la cobertura ---
    ctx.set_offline(False)
    pag.evaluate("window.dispatchEvent(new Event('online'))")
    pag.wait_for_function("!document.body.innerText.includes('Pendiente de subir')", timeout=15000)
    pag.get_by_text('Entrada escrita en el PC').wait_for()
    foto('8-subida.png')

    h = json.loads(archivos[json_ruta])
    assert h['programa'] == 'Generador de Fichas'
    assert h['valores']['TELEFONO_2'] == '611 111 111', 'se conserva lo del PC'
    textos = [e['TEXTO'] for e in h['valores']['HISTORIAL']]
    assert textos == ['Sale del domicilio a pie.', 'Entrada escrita en el PC', 'Entra en un bar (entrada de prueba sin cobertura).'], textos
    nueva = h['valores']['HISTORIAL'][-1]
    assert nueva['LUGAR'] == 'Praza Inventada 3, Vigo' and re.fullmatch(r'\d\d/\d\d/\d{4}', nueva['FECHA']) and re.fullmatch(r'\d\d:\d\d', nueva['HORA'])
    assert nueva['FOTOS'][0]['pie'] == 'Fachada del bar' and nueva['FOTOS'][0]['ruta'].startswith('Imagenes/Aportaciones/MOVIL_')
    assert f"{E}/0440 - EDP0150 - Ana Ejemplo/{nueva['FOTOS'][0]['ruta']}" in archivos
    assert archivos[json_ruta].decode().startswith('{\n    "programa"'), 'mismo estilo que Python (indent=4)'
    reg = archivos[f'{E}/0440 - EDP0150 - Ana Ejemplo/Registro de actividad 0440.txt']
    assert reg.startswith(b'Fecha\tHora\tOrdenador\tUsuario\tAcci\xc3\xb3n\tDetalle\r\n')
    print(reg.decode('utf-8-sig'))

    # --- Bloqueo al volver de segundo plano y ajustes ---
    pag.get_by_label('Atrás').click()
    pag.get_by_label('Ajustes').click(); pag.get_by_text('Cerrar sesión y borrar datos del móvil').wait_for(); foto('9-ajustes.png')
    nav.close()
srv.shutdown()

assert not BORRADOS, 'la app intentó borrar algo'
if errores: print('ERRORES EN CONSOLA:', *errores, sep='\n  '); sys.exit(1)
print('PRUEBA EN NAVEGADOR SUPERADA. Capturas en', CAPTURAS)
