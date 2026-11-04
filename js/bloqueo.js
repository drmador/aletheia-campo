// ============================================================
//  BLOQUEO CON PIN O HUELLA
//  El PIN no se guarda: solo una «huella matemática» (PBKDF2).
//  La huella dactilar la comprueba Android; la app nunca la ve.
// ============================================================
import { kv } from './almacen.js';

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function derivar(pin, sal) {
  const clave = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(sal), iterations: 310000, hash: 'SHA-256' }, clave, 256));
}

export const tienePin = async () => !!(await kv.get('pin'));

export async function fijarPin(pin) {
  const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
  await kv.set('pin', { sal, hash: await derivar(pin, sal) });
  await kv.set('fallos', 0);
}

/** Devuelve {ok} o {ok:false, esperar: segundos} */
export async function comprobarPin(pin) {
  const fallos = (await kv.get('fallos')) || 0;
  const hasta = (await kv.get('bloqueadoHasta')) || 0;
  if (Date.now() < hasta) return { ok: false, esperar: Math.ceil((hasta - Date.now()) / 1000) };
  const p = await kv.get('pin');
  if (p && (await derivar(pin, p.sal)) === p.hash) { await kv.set('fallos', 0); return { ok: true }; }
  const f = fallos + 1;
  await kv.set('fallos', f);
  if (f >= 5) await kv.set('bloqueadoHasta', Date.now() + Math.min(30 * 2 ** (f - 5), 3600) * 1000);
  return { ok: false, fallos: f };
}

// ---------- Huella (WebAuthn con el sensor del propio móvil) ----------
export async function huellaDisponible() {
  return !!(window.PublicKeyCredential &&
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false)));
}
export const tieneHuella = async () => !!(await kv.get('huella'));

export async function activarHuella() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Aletheia Campo', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'aletheia', displayName: 'Aletheia' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
    },
  });
  await kv.set('huella', [...new Uint8Array(cred.rawId)]);
}
export const desactivarHuella = () => kv.del('huella');

export async function comprobarHuella() {
  const id = await kv.get('huella');
  if (!id) return false;
  const r = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: new Uint8Array(id) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return !!(r && r.response && r.response.authenticatorData && (new Uint8Array(r.response.authenticatorData)[32] & 0x04));
}
