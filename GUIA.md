# Aletheia Campo — guía de puesta en marcha

App para el móvil que trabaja sobre los mismos expedientes de OneDrive que el «Generador de Fichas».
Sirve para consultar fichas y, sobre todo, para añadir entradas al historial sobre el terreno, con o sin cobertura.

Hay que hacer **cuatro pasos, una sola vez**. Cuenta con unos 30 minutos.

---

## Paso 1 · Publicar la app en GitHub Pages (gratis)

La app es una página web que se instala en el móvil. Para eso tiene que estar publicada en una dirección segura (https).

- En GitHub se publica **solo el programa**. No se sube ningún expediente ni ningún dato.
- El código queda visible, pero no contiene contraseñas ni nada secreto.

1. Crea una cuenta en <https://github.com> si no tienes.
2. Pulsa **New repository** (nuevo repositorio).
   - Nombre: `aletheia-campo`.
   - Visibilidad: **Public** (en las cuentas gratuitas, GitHub Pages solo funciona así).
   - Pulsa **Create repository**.
3. En el repositorio, pulsa **uploading an existing file** y arrastra **todo el contenido** de la carpeta `aletheia-campo`:
   - `index.html`, `sw.js`, `manifest.webmanifest` y las carpetas `css`, `js` e `icons`.
   - La carpeta `pruebas` no hace falta.
   - Pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En «Branch» elige **main** y la carpeta **/ (root)**, y pulsa **Save**.
5. En un par de minutos aparece arriba la dirección de la app, del tipo:
   `https://TU-USUARIO.github.io/aletheia-campo/`
   **Apúntala tal cual, con la barra final.**

## Paso 2 · Registrar la app en Microsoft

Así Microsoft sabe que esta app puede pedirte permiso para entrar en tu OneDrive.

1. Entra en <https://entra.microsoft.com> con tu cuenta de Hotmail.
   - Si te dice que necesitas un «directorio» o un «inquilino» (*tenant*), crea una cuenta gratuita de Azure en <https://azure.microsoft.com/free>.
   - Puede que te pida una tarjeta para verificar tu identidad. Registrar la app **no cuesta nada**.
2. Ve a **Aplicaciones → Registros de aplicaciones → Nuevo registro**.
   - **Nombre:** `Aletheia Campo`
   - **Tipos de cuenta admitidos:** «Solo cuentas personales de Microsoft».
   - **URI de redirección:** elige la plataforma **«Aplicación de página única (SPA)»** y pega la dirección del paso 1, con la barra final.
   - Pulsa **Registrar**.
3. En la página que aparece, copia el **«Id. de aplicación (cliente)»**. Es un código como `1a2b3c4d-1111-2222-3333-444455556666`.
4. (Recomendado) En **Permisos de API → Agregar un permiso → Microsoft Graph → Permisos delegados**, marca:
   - `Files.ReadWrite`
   - `User.Read`
   - `offline_access`

   Guarda los cambios.

## Paso 3 · Poner el código en la app

1. En GitHub, abre `js/config.js` y pulsa el lápiz (editar).
2. Cambia `PEGAR_AQUI_EL_ID_DE_CLIENTE` por el código del paso 2. Deja las comillas.
3. Pulsa **Commit changes**. En un minuto la web ya está actualizada.

## Paso 4 · Instalar en el Android

1. Abre **Chrome** en el móvil y ve a la dirección del paso 1.
2. Menú **⋮ → Instalar aplicación** (o «Añadir a pantalla de inicio»). Aparecerá el icono **Aletheia**.
3. Ábrela desde ese icono y sigue estos pasos:
   1. **Entrar con mi cuenta de Microsoft.** La primera vez Microsoft te pregunta si das permiso: acepta.
   2. **Elige un PIN** (de 4 a 8 cifras) y, si quieres, activa la **huella**.
   3. **Elige la carpeta de expedientes:** navega por tu OneDrive hasta la carpeta que contiene las carpetas «0440 - EDP0150 - …» y pulsa **Usar esta carpeta**.

---

## Uso diario

- **Buscar un expediente:** escribe el número, el EDP o el nombre del investigado.
- **Ficha:** pestañas Historial, Datos, Vehículos, Propiedades, Fotos y PDF.
  - Las direcciones tienen un enlace 📍 **Mapa** (Google Maps).
  - Los teléfonos se pueden pulsar para llamar.
  - Los PDF se abren con el visor de OneDrive. No se guardan en el móvil.
- **Nueva entrada** (pestaña Historial):
  - Se rellenan solas la fecha, la hora y la dirección aproximada por GPS. Todo se puede corregir.
  - Escribe la descripción y añade fotos con **Cámara** o **Galería**. Puedes poner un pie a cada foto.
  - Las fotos se suben **tal cual** (sin recomprimir) a `Imagenes/Aportaciones`, con nombres del tipo `MOVIL_20261104_103000_ab12.jpg`.
- **Sin cobertura:** guarda igual.
  - La entrada sale marcada como **«Pendiente de subir»**.
  - Se sube sola cuando vuelve la conexión.
  - Arriba verás un aviso con el número de entradas pendientes. Púlsalo para forzar la subida.
- **«⚠ Entrar»:** por seguridad, Microsoft obliga a las apps web a renovar la sesión cada día.
  - Cuando veas este aviso, púlsalo y entra de nuevo. Suele bastar con un toque.
  - **Las entradas pendientes no se pierden.**
- **Bloqueo:** la app pide PIN o huella al abrirla y cuando vuelves a ella tras 3 minutos en segundo plano.
  - Tras 5 PIN fallidos, hay que esperar cada vez más tiempo antes de reintentar.

## Qué hace (y qué no hace) con tus datos

- **Lee** la ficha `Información NNNN.json`.
- **Solo escribe** en tres sitios:
  1. **El historial de la ficha.**
     - Justo antes de guardar, vuelve a leer la ficha de OneDrive y **añade solo las entradas nuevas**. Compara por fecha, hora y texto, así que una entrada nunca se duplica.
     - Si el PC ha guardado la ficha entre medias, OneDrive lo detecta (eTag): la app vuelve a leer y fusiona.
     - No toca ningún otro campo, tampoco «guardado».
     - Escribe el JSON con el mismo formato que usa el programa de Windows (sangría, acentos, BOM…).
  2. **Fotos nuevas** en `Imagenes/Aportaciones`.
     - Nunca sobrescribe una foto: si el nombre ya existe, usa otro.
  3. **El registro de actividad** `Registro de actividad NNNN.txt`.
     - Solo añade líneas al final, con «Ordenador» = `Móvil`.
     - Si el archivo no existe, lo crea igual que el PC: con la línea de cabecera, sin BOM y con fin de línea CRLF.
     - Usa el número tal cual está en la ficha (`EXP_NUMERO`), aunque tenga 5 cifras: `Registro de actividad 99999.txt`.
- **No borra nada, nunca.** El programa no tiene ninguna función de borrar.
- **Sin servidores intermedios:** el móvil habla directamente con Microsoft.
  - La única excepción es **opcional**: convertir el GPS en dirección usa OpenStreetMap, que recibe **solo las coordenadas**, sin ningún dato del expediente.
  - Se desactiva en **Ajustes → Ubicación**. Entonces se ponen las coordenadas y tú escribes la dirección.
- **En el móvil** se guarda solo esto:
  - la lista de expedientes;
  - de las fichas que hayas abierto (para consultarlas sin cobertura), solo los campos que enseña la app. **No se guardan** los datos del contrato, del cliente, de la colaboración ni del informe (claves de PDF incluidas);
  - las entradas pendientes;
  - el PIN, cifrado de forma que no se puede leer.
- **Ajustes → Cerrar sesión** borra todo eso del móvil. Si quedan entradas sin subir, te avisa antes.

## Importante mientras no esté el cambio en el programa de Windows

Hasta que el Generador de Fichas aprenda a fusionar el historial al guardar, **no tengas abierta en el PC la ficha que estás completando desde el móvil**. Si la tienes abierta y la guardas, el PC sobrescribirá lo que haya añadido el móvil.

## Si cambias campos.json en el PC

La app enseña la ficha con los nombres, el orden y las secciones de tu `campos.json`, que están copiados en `js/campos.js`.

- Si añades o cambias campos en el PC, la app sigue funcionando. Los campos nuevos salen en «Otros datos».
- Para que salgan con su nombre y en su sitio:
  1. En el PC, ejecuta `python herramientas\generar_campos.py "C:\ruta\a\campos.json"`.
  2. Sube el `js/campos.js` nuevo a GitHub.
  3. Sube el número de `VERSION` en `sw.js`.
- Ese archivo no copia nada de las secciones Contrato, Colaboración ni Informe.

## Actualizar la app más adelante

1. Sube a GitHub los archivos nuevos.
2. En `sw.js`, cambia el número de `VERSION` (por ejemplo `app-v1.0.1`). Así el móvil sabe que hay versión nueva.
3. La siguiente vez que abras la app con conexión, se actualiza sola. A veces hace falta cerrarla y abrirla dos veces.

## Pruebas (para quien mantenga el código)

- `node pruebas/prueba.mjs` → 15 pruebas de la lógica de fusión, del registro de actividad y del formato JSON comparado con Python real.
- `python3 pruebas/prueba_navegador.py` → prueba completa en Chrome, con OneDrive simulado y datos inventados:
  - entrar, PIN, elegir carpeta, buscar y consultar;
  - crear una entrada sin cobertura mientras el PC cambia la ficha, y subirla después.
