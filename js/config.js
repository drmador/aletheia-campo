// ============================================================
//  AJUSTES DE LA APP  (lo único que hay que tocar a mano)
// ============================================================
export const CONFIG = {
  // Código que te da Microsoft al registrar la app (ver GUIA.md, paso 2).
  // Tiene esta forma: 1a2b3c4d-1111-2222-3333-444455556666
  CLIENT_ID: '2f124bce-d10b-43ef-9d3b-704c1e3b14b5',

  // Cuenta personal de Microsoft (Hotmail / Outlook.com).
  TENANT: 'consumers',

  // Permisos que se piden a Microsoft:
  //  - Files.ReadWrite: leer y añadir archivos en tu OneDrive
  //  - User.Read: saber tu nombre (para el registro de actividad)
  //  - offline_access: no tener que escribir la contraseña cada vez
  SCOPES: ['Files.ReadWrite', 'User.Read', 'offline_access'],

  // Minutos en segundo plano tras los que la app vuelve a pedir PIN/huella.
  MINUTOS_BLOQUEO: 3,

  // Nombre que aparece en la columna «Ordenador» del registro de actividad.
  ORDENADOR: 'Móvil',
};
