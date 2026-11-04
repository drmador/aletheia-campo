// ============================================================
//  INICIO DE SESIÓN CON MICROSOFT (OAuth 2.0 + PKCE)
//  El móvil habla directamente con login.microsoftonline.com.
//  Ningún servidor intermedio ve la contraseña ni los datos.
// ============================================================
import { CONFIG } from './config.js';
import { kv } from './almacen.js';

const BASE = () => `https://login.microsoftonline.com/${CONFIG.TENANT}/oauth2/v2.0`;
const SCOPE = () => [...CONFIG.SCOPES, 'openid', 'profile'].join(' ');
export const urlRetorno = () => location.origin + location.pathname.replace(/index\.html$/, '');

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const aleatorio = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

export class SesionCaducada extends Error {
  constructor() { super('Hay que volver a entrar con la cuenta de Microsoft.'); this.name = 'SesionCaducada'; }
}

export function configurada() {
  return CONFIG.CLIENT_ID && !CONFIG.CLIENT_ID.startsWith('PEGAR');
}

/** Lleva al usuario a la página de Microsoft para entrar. */
export async function entrar() {
  const verificador = aleatorio(48);
  const reto = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
  const estado = aleatorio(16);
  sessionStorage.setItem('pkce', JSON.stringify({ verificador, estado }));
  const p = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    response_type: 'code',
    redirect_uri: urlRetorno(),
    scope: SCOPE(),
    state: estado,
    code_challenge: reto,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  location.assign(`${BASE()}/authorize?${p}`);
}

/** Al volver de Microsoft: cambia el código por los tokens. Devuelve true si había vuelta. */
export async function procesarVuelta() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return false;
  history.replaceState(null, '', urlRetorno());
  if (q.has('error')) throw new Error('Microsoft no permitió entrar: ' + (q.get('error_description') || q.get('error')));
  const guardado = JSON.parse(sessionStorage.getItem('pkce') || 'null');
  sessionStorage.removeItem('pkce');
  if (!guardado || guardado.estado !== q.get('state')) throw new Error('La vuelta de Microsoft no coincide. Vuelve a intentarlo.');
  await pedirTokens({
    grant_type: 'authorization_code',
    code: q.get('code'),
    redirect_uri: urlRetorno(),
    code_verifier: guardado.verificador,
  });
  return true;
}

async function pedirTokens(extra) {
  const cuerpo = new URLSearchParams({ client_id: CONFIG.CLIENT_ID, scope: SCOPE(), ...extra });
  const r = await fetch(`${BASE()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (extra.grant_type === 'refresh_token') throw new SesionCaducada();
    throw new Error('Error al entrar: ' + (j.error_description || j.error || r.status));
  }
  const sesion = {
    access: j.access_token,
    refresh: j.refresh_token,
    caduca: Date.now() + (j.expires_in - 120) * 1000,
  };
  await kv.set('sesion', sesion);
  return sesion;
}

let renovando = null;
/** Devuelve un token válido para Microsoft Graph (renueva si hace falta). */
export async function token() {
  const s = await kv.get('sesion');
  if (!s) throw new SesionCaducada();
  if (s.access && Date.now() < s.caduca) return s.access;
  if (!s.refresh) throw new SesionCaducada();
  if (!navigator.onLine) throw new Error('Sin conexión');
  renovando ??= pedirTokens({ grant_type: 'refresh_token', refresh_token: s.refresh }).finally(() => (renovando = null));
  return (await renovando).access;
}

export async function hayCuenta() {
  return !!(await kv.get('sesion'));
}
