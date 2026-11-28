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
  - Se rellenan solas la fecha, la hora y la dirección aproximada. Todo se puede corregir.
  - Las coordenadas del GPS se guardan **aparte**, en el dato `GPS` de la entrada (formato `42.240612, -8.720700`), y nunca se mezclan con «Lugar». Así el programa de Windows las recibe y se pueden corregir en el mapa. Con «Quitar GPS» la entrada se guarda sin coordenadas.
  - Sin cobertura, el lugar queda vacío para que lo escribas tú; las coordenadas se guardan igualmente.
  - Escribe la descripción y añade fotos con **Cámara** o **Galería**. Puedes poner un pie a cada foto.
  - Las fotos se suben **tal cual** (sin recomprimir) a `Imagenes/Aportaciones`, con nombres del tipo `MOVIL_20261104_103000_ab12.jpg`.
- **Entradas solo con foto:** ya no hace falta escribir nada (ni un punto). Basta con una foto, un texto o los km.
- **▶ Inicio de servicio / ■ Fin de servicio** (pestaña Historial): crean una entrada con el texto `Se inicia servicio.` o `Finaliza servicio.`, con fecha, hora, lugar y GPS.
  - Primero piden **«Km del coche (opcional)»**, con el teclado de números. **Guardar** los anota; **Saltar** guarda sin km. Puedes añadir más texto.
  - En **Nueva entrada** también hay un campo «Km del coche (opcional)».
  - Los km se guardan en la entrada como `"KM": "84120"` (texto, solo cifras; vale escribir `84.120` o `84 120 km`), junto con `"ordenador": "Móvil"`. Si no se anotan, no se pone nada.
  - En el historial se ven como «🚗 84.120 km». El PC los usa para calcular los km del servicio; no salen en la ficha ni en el informe.
- **🏢 Salida del despacho / 🏢 Llegada al despacho:** piden los km del coche al salir y al volver, igual que Inicio y Fin de servicio. Se guardan con `"TRAYECTO": "salida"` o `"llegada"`: el PC los usa para facturar y **no los imprime** ni en la ficha ni en el informe. Si sales y aún no has registrado la llegada, arriba del historial sale «🏢 Saliste del despacho a las 07:40» con el botón para registrarla.
  - El resumen del día da los **km facturables** (de la salida a la llegada) y, entre paréntesis, los del **servicio** (lo que se movió el investigado) y los del **trayecto**.
- **Servicio abierto:** si has pulsado «Inicio de servicio» y aún no hay un «Fin», arriba del historial sale «▶ Servicio iniciado a las 07:00 · 🚗 84.120 km» con un botón **■ Finalizar servicio**. Cuenta lo de hoy y lo de ayer (servicios de noche); un inicio olvidado de hace días no molesta.
- **Matrículas a mano:** en «Nueva entrada» (y en inicio/fin de servicio), debajo de la descripción salen los vehículos de la ficha (matrícula, marca, modelo y color). Un toque escribe la matrícula donde está el cursor.
- **Copias en conflicto:** si en la carpeta del expediente hay archivos como `Información 0439-DESKTOP-….json` o `Registro de actividad 0439-DESKTOP-….txt` (OneDrive guardó dos versiones a la vez), la app avisa en rojo arriba del expediente. No los toca: hay que revisarlos en el PC.
- **🧭 Cómo llegar:** junto a cada dirección (domicilios, trabajo, familiares) hay, además de «📍 Mapa», un enlace que abre Google Maps con la ruta en coche desde donde estás.
- **Atajos del icono:** mantén pulsado el icono de la app y salen «Nota de voz», «Nueva entrada», «Inicio» y «Fin». Te llevan directamente al **último expediente** que abriste (después del PIN). En la lista de expedientes, arriba, el botón «↩ Último» abre ese expediente. Si los atajos no aparecen, pueden tardar hasta un día (Chrome actualiza la app instalada) o puedes desinstalarla e instalarla de nuevo.
- **Huella digital (SHA-256):** al guardar una entrada, el móvil calcula la huella de cada foto, vídeo y nota de voz **antes de subir nada**. Se guarda en la ficha (`"sha256"` en cada foto o vídeo, `"AUDIO_SHA256"` en las notas) y en el registro de actividad. Sirve para demostrar que el archivo entregado es el que se hizo sobre el terreno.
- **🎥 Vídeo con marca de tiempo:** en «Nueva entrada», junto a «🎬 Vídeo» (cámara normal, sin marca), el botón «🎥 Vídeo con marca» graba desde la app con una franja en la imagen: **fecha, hora con segundos, nº de expediente, EDP y GPS**. La marca nace con el vídeo, así que el original ya la lleva y su huella digital la cubre. Calidad hasta 1080p, sin el zoom ni la estabilización de la cámara del móvil; la pantalla debe estar encendida (si la app pasa a segundo plano, se para y se guarda lo grabado). Máximo 30 minutos por vídeo. En la ficha va con `"marca": true` y el archivo termina en `_marca`. **Vertical u horizontal:** coloca el móvil como quieras antes de pulsar «Grabar»; la imagen y la marca se ponen de pie solas y la orientación queda fija hasta que pares. **Zoom y cámaras:** si el móvil lo permite, aparece un deslizador 🔍 (o pellizca la imagen con dos dedos) y un botón «🔄 Cámara» para pasar por las cámaras traseras que el móvil deja usar al navegador. El zoom de la app tiene menos alcance que el de la cámara normal; para planos lejanos, mejor «🎬 Vídeo».
- **Hora del vídeo:** al adjuntar un vídeo de la galería, la app lee la fecha interna del archivo (o la del nombre) y ofrece «Usar la hora del vídeo», como con las fotos.
- **🎬 Vídeos:** en «Nueva entrada», el botón «🎬 Vídeo» graba uno o lo elige de la galería. Se sube a `Videos/` del expediente, por trozos (vale cualquier tamaño) y sin sobrescribir nunca. Con la opción «Subir vídeos solo con Wi-Fi» (Ajustes, activada de serie), la entrada con vídeo espera al Wi-Fi; desde el expediente puedes pulsar «Subir ahora con datos». En el historial, «🎬 Ver vídeo» lo abre con el reproductor de OneDrive.
- **Uso privado:** en Ajustes → «Uso privado» aparece el código de tu cuenta de Microsoft (no es tu correo ni una contraseña). Pégalo en GitHub, en `js/config.js`, en la línea `CUENTA_ID: '',` (entre las comillas). Desde entonces la app rechaza cualquier otra cuenta con el aviso «App de uso privado». Si entras por error con otra cuenta en tu móvil, no se pierde nada de lo pendiente.
- **Identificación** (arriba de la pestaña Datos): foto, nombre, edad, estatura, pelo y complexión, domicilio habitual con mapa, matrículas y trabajos con su horario. Es lo que se mira en plena vigilancia, sin bajar por toda la ficha.
- **Vehículos abreviados:** matrícula, marca, modelo, color y fotos. El resto (titular, DGT, ITV, seguro, PDF del informe…) queda plegado en «Ver todos los datos».
- **Matrículas de familiares:** los botones de matrículas de «Nueva entrada» incluyen también los vehículos de los familiares (campo «Vehículo / matrícula»), con el nombre de quién es.
- **Colaborador:** las entradas del historial hechas por un colaborador llevan la etiqueta «👤 Nombre».
- **Toda la ficha, también lo nuevo del PC:** la pestaña Datos enseña los datos que el programa de Windows va añadiendo aunque la app aún no los conozca. Por ejemplo, otros familiares, otros hijos u otros trabajos, cada uno en su tarjeta con sus datos, sus fotos y un enlace al mapa en las direcciones. El tipo y las notas de cada domicilio salen debajo de su dirección. Los campos internos del programa no se enseñan.
  - Los **vehículos** salen también en la ficha, resumidos y con sus fotos. Todos sus datos siguen en la pestaña Vehículos, con un botón **📄 Abrir PDF** para el informe de la DGT, que se abre desde OneDrive.
  - La pestaña **Fotos** reúne todas las fotos de la ficha.
  - Ya está con el `campos.json` del programa 7.10 (incluida la sección «Familia y entorno»). Si vuelves a cambiarlo, mándalo actualizado (ver «Si cambias campos.json en el PC»).
- **Hora de la foto:** al añadir una foto hecha en otro momento (galería, dash cam…), la app mira cuándo se hizo. Primero lo busca en los datos que guarda la cámara dentro de la foto (EXIF) y, si no, en el nombre del archivo (`20261120_091205.jpg`). Si no coincide con la hora de la entrada, ofrece **«Usar la hora de la foto»**, o **«Usar la hora y el lugar de la foto»** si la foto trae GPS. Si solo cambia la hora, avisa de que el GPS es el de ahora. La foto se lee en el móvil y no se envía a ningún sitio.
- **Resumen del día:** arriba del historial, «Hoy: servicio 07:00–10:00 (3 h 00 min) · 84.120 → 84.310 km (190 km) · 12 entradas · 18 fotos». Sirve para comprobar sobre el terreno que no falta el fin de servicio ni los km. El cálculo para el albarán lo hace el PC.
- **🌙 Modo noche:** botón en la cabecera de todas las pantallas. Pone la app casi negra, con letras tenues y fotos atenuadas, para vigilancias nocturnas. Se recuerda en este móvil; ☀ lo quita.
- **🎙 Nota de voz** (pestaña Historial, botón rojo):
  - Al pulsarlo **empieza a grabar**: punto rojo y tiempo en grande. Se para con **«Parar y guardar»**, como mucho a los 5 minutos.
  - **Nunca graba sola ni en segundo plano.** Si sales de la app, se apaga la pantalla o pulsas «atrás» mientras graba, la grabación se para y lo grabado se guarda. Mientras graba, la app mantiene la pantalla encendida.
  - Al empezar se guardan la fecha y la hora de inicio, el GPS y la dirección aproximada, que puedes corregir.
  - Al parar, la nota queda guardada en el móvil. Puedes escucharla y añadir fotos a esa misma entrada. Pulsa **«Listo»** para que se suba.
  - Si salió mal, pulsa **«🗑 Descartar y volver a grabar»** (pide confirmación). Solo se puede mientras no hayas pulsado «Listo», porque hasta entonces la nota está únicamente en el móvil. Después ya va hacia OneDrive, donde la app nunca borra nada: graba otra nota y descarta la mala en el PC al revisar.
  - **La app no transcribe nada** ni usa ningún servicio de voz: el audio va tal cual a OneDrive y el PC lo transcribe sin internet.
  - Se sube primero el audio a `Audios/Nota AAAA-MM-DD HH-MM-SS.m4a` (o `.webm`, según lo que grabe el móvil), sin sobrescribir nunca (si existe, `(2)`, `(3)`…). Después se añade la entrada con `TEXTO` vacío, `AUDIO`, `AUDIO_ESTADO: "pendiente"`, `AUDIO_DURACION` y `ordenador: "Móvil"`. En el registro de actividad queda «Nota de voz grabada».
  - En el historial se ve como «🎙 Nota de voz pendiente de transcribir», con un botón para escucharla.
  - Cada nota muestra el estado de su audio: **📱 En el móvil** (la estás completando), **⏳ Pendiente de subir** (con el texto «🎙 Audio pendiente de subir») o **☁ Subido**.
  - **Escuchar:** si el audio sigue en el móvil, se usa esa copia. Si no, se descarga de OneDrive («Descargando audio…») a una caché temporal en memoria, que se borra al cerrar la app.
  - Si el audio no está en la ruta de la ficha, la app lo busca en `Audios` y en todo el expediente, por si se movió o se renombró, y avisa de dónde lo ha encontrado.
  - Si no está en ningún sitio, se avisa: «El audio no está en el móvil ni en OneDrive» y la nota pasa a **⚠ No está en OneDrive**. Si el fallo es otro (sin conexión, error de OneDrive), se dice cuál.
  - La copia del móvil **solo se suelta cuando OneDrive tiene el archivo completo (mismo tamaño)**. Si la subida se corta, el audio se queda en el móvil y se reintenta. Lo que se quedó a medias en OneDrive no se borra; el audio completo se sube como `(2)`. Lo mismo vale para las fotos.
- **Envíos pendientes (cola):** todo lo que no se ha podido subir (entradas, fotos, notas de voz) se queda guardado en el móvil, aunque cierres la app o apagues el móvil.
  - La app lo reintenta sola: al volver la cobertura, al abrir la app, al abrir el expediente y cada minuto mientras quede algo.
  - Cada entrada sin subir lleva **«⏳ Pendiente de subir»**. Arriba, en el expediente, sale **«⏳ N pendientes · Reintentar ahora»**.
  - Si un envío falla, el aviso **no desaparece al reintentar**: queda «⏳ No se pudo subir · se reintentará», con el último motivo, hasta que se suba de verdad.
  - **Una entrada solo deja de estar pendiente cuando la app vuelve a leer la ficha de OneDrive y la encuentra dentro.**
- **Lo del PC manda:** al abrir un expediente (o con el botón **↻**) la app lee la ficha tal como la dejó el PC, con sus correcciones.
  - De su cola solo sube lo que **nunca llegó a subirse**.
  - Antes de subir, comprueba en OneDrive si la entrada ya está, aunque en el PC le hayan cambiado el texto o la hora (la reconoce también por sus fotos). Si ya está, no la vuelve a subir.
  - Si su clave está en `valores._DESCARTADAS` (lo que el PC corrigió o quitó), **no la sube**, ni sus fotos ni su audio. En el registro queda «entrada no subida (descartada en el PC)».
  - Entiende `_DESCARTADAS` tanto como lista de claves como en el formato real del programa 7.x, que es un apartado por campo (`{"HISTORIAL": [...], ...}`) con los textos en mayúsculas y sin espacios.
  - `_DESCARTADAS` se conserva tal cual.
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
     - **No reescribe la ficha**: copia el archivo de OneDrive tal cual, carácter a carácter, e **inserta** las entradas nuevas al final del historial. Todo lo demás queda idéntico byte a byte: otros campos, «guardado», entradas y fotos ya existentes, y datos que la app no conoce (por ejemplo `giro`, `tapar`, `VIA` u `ordenador` del programa 6.6), incluido el formato de los números (`1.0` sigue siendo `1.0`).
     - Antes de subir, comprueba que el resultado es exactamente «ficha leída + entradas nuevas». Si no lo fuera, no sube nada y avisa.
     - La app nunca modifica una entrada ni una foto que ya exista.
     - Las notas de voz se distinguen por el nombre del audio: dos notas del mismo minuto no se confunden, y si el PC ya la ha transcrito o dividido, un reintento del móvil no la vuelve a añadir.
     - Al cerrar sesión se borran del móvil también los audios. Los de OneDrive nunca se borran.
     - En el móvil, las fotos se ven tal cual, sin girar ni tapar; eso solo se aplica al generar los documentos en el PC.
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

- `node pruebas/prueba.mjs` → 62 pruebas de la fusión del historial (con datos del PC que la app no conoce, comparando el resultado con Python real), del registro de actividad y del formato JSON.
- `python3 pruebas/prueba_navegador.py` → prueba completa en Chrome, con OneDrive simulado y datos inventados:
  - entrar, PIN, elegir carpeta, buscar y consultar;
  - crear una entrada sin cobertura mientras el PC cambia la ficha, y subirla después;
  - grabar notas de voz con un micrófono simulado (sin cobertura, y pasando la app a segundo plano a mitad), y subirlas después.
