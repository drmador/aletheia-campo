"""
Crea js/campos.js a partir del campos.json del Generador de Fichas.

Uso (cuando cambies campos.json en el PC):
    python herramientas/generar_campos.py "RUTA\\A\\campos.json"
y sube el js/campos.js nuevo a GitHub (y sube VERSION en sw.js).

Solo copia lo que la app necesita para ENSEÑAR la ficha (nombres, orden,
enlaces a mapas). No copia nada del contrato, colaboración ni informe,
porque la app no los muestra.
"""
import json, sys, os, re

# Secciones de la ficha que se ven en el móvil (por su «titulo» en campos.json)
SECCIONES_APP = ['Expediente', 'Datos personales', 'Direcciones', 'Contacto y RRSS', 'Trabajo',
                 'Vehículos', 'Hij@', 'Antecedentes e info.', 'Historial']
# De la sección Expediente, solo estos campos
EXPEDIENTE_SOLO = ['EXP_NUMERO', 'EXP_EDP', 'FECHA', 'FECHA_CIERRE', 'JUDICIALIZADO', 'JUDICIAL_PROCEDIMIENTO', 'JUDICIAL_FIN']
# Claves de campos.json que se copian a cada campo
CLAVES = ['etiqueta', 'clave', 'texto', 'tipo', 'completo', 'enlace_mapa', 'consulta_mapa', 'texto_casilla']
CLAVES_LISTA = ['claves_titulo', 'nombre_item_pdf', 'texto_fotos']


def limpia_campo(c):
    out = {k: c[k] for k in CLAVES if k in c}
    if 'texto' in out:  # quita ayudas del formulario: «EDP (p. ej. EDP0156)» -> «EDP»
        out['texto'] = re.sub(r'\s*\((p\. ?ej\.|vacío|se rellena|=)[^)]*\)', '', out['texto']).strip()
    if c.get('tipo') == 'vehiculos' or c.get('tipo') == 'historial':
        out['campos'] = [limpia_campo(x) for x in c.get('campos', [])]
        out.update({k: c[k] for k in CLAVES_LISTA if k in c})
    return out


def main(origen, destino):
    d = json.load(open(origen, encoding='utf-8-sig'))
    secciones, todas = [], []
    for s in d['secciones']:
        etiquetas = [c['etiqueta'] for c in s['campos'] if c.get('etiqueta')]
        todas += etiquetas
        if s['titulo'] not in SECCIONES_APP:
            continue
        campos = [c for c in s['campos'] if c.get('etiqueta') and c.get('tipo') not in ('subtitulo', 'boton', 'carpeta', 'imagen_fija')]
        if s['titulo'] == 'Expediente':
            campos = [c for c in campos if c['etiqueta'] in EXPEDIENTE_SOLO]
        secciones.append({'titulo': s['titulo'], 'campos': [limpia_campo(c) for c in campos]})
    datos = {
        'version': d.get('version_minima', ''),
        'pais_mapa': d.get('pais_mapa', 'España'),
        'carpeta_fotos': d.get('carpeta_fotos_expediente', 'Imagenes/Aportaciones'),
        'patron_expediente': d.get('patron_expediente', r'^(\d+)\s*-\s*(EDP\d+)'),
        'nombre_archivo': d.get('nombre_archivo', 'Información {EXP_NUMERO}'),
        'archivo_actividad': d.get('archivo_actividad', 'Registro de actividad {EXP_NUMERO}.txt'),
        'secciones': secciones,
        # Todos los campos que conoce el programa (para no enseñar como «otros» los que se ocultan a propósito)
        'conocidos': sorted(set(todas)),
    }
    with open(destino, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GENERADO por herramientas/generar_campos.py a partir de campos.json. No editar a mano.\n')
        f.write('export const CAMPOS = ')
        json.dump(datos, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    print(f'{destino}: {len(secciones)} secciones, {sum(len(s["campos"]) for s in secciones)} campos.')


if __name__ == '__main__':
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(raiz, 'campos.json'), os.path.join(raiz, 'js', 'campos.js'))
