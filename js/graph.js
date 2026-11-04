// ============================================================
//  ACCESO A ONEDRIVE (Microsoft Graph)
//  Regla de oro: este archivo NO tiene ninguna función de borrar.
// ============================================================
const G = 'https://graph.microsoft.com/v1.0';

export class ErrorGraph extends Error {
  constructor(estado, mensaje) { super(mensaje); this.estado = estado; this.name = 'ErrorGraph'; }
}

const ruta = (rel) => rel.split('/').filter(Boolean).map(encodeURIComponent).join('/');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {{token: () => Promise<string>, fetch?: typeof fetch}} dep
 */
export function crearGraph({ token, fetch: f = (...a) => fetch(...a) }) {
  async function pedir(url, { metodo = 'GET', cabeceras = {}, cuerpo, crudo = false } = {}) {
    for (let intento = 0; ; intento++) {
      const r = await f(url.startsWith('http') ? url : G + url, {
        method: metodo,
        headers: { Authorization: 'Bearer ' + (await token()), ...cabeceras },
        body: cuerpo,
      });
      if ((r.status === 429 || r.status === 503 || r.status === 504) && intento < 4) {
        const s = Number(r.headers.get('Retry-After')) || 2 ** intento;
        await espera(Math.min(s, 30) * 1000);
        continue;
      }
      if (!r.ok) {
        let msg = `Error ${r.status} de OneDrive`;
        try { const j = await r.json(); msg = j?.error?.message || msg; } catch { /* nada */ }
        throw new ErrorGraph(r.status, msg);
      }
      if (crudo) return r;
      if (r.status === 204) return null;
      return r.json();
    }
  }

  const CAMPOS = 'id,name,eTag,size,folder,file,webUrl,lastModifiedDateTime,parentReference';

  return {
    pedir,
    yo: () => pedir('/me?$select=displayName,userPrincipalName'),
    raiz: () => pedir(`/me/drive/root?$select=${CAMPOS}`),

    item: (driveId, id) =>
      pedir(`/drives/${driveId}/items/${id}?$select=${CAMPOS},@microsoft.graph.downloadUrl`),

    /** Busca un archivo por ruta relativa a una carpeta. Devuelve null si no existe. */
    async itemPorRuta(driveId, carpetaId, rel) {
      try {
        return await pedir(`/drives/${driveId}/items/${carpetaId}:/${ruta(rel)}?$select=${CAMPOS},@microsoft.graph.downloadUrl`);
      } catch (e) {
        if (e.estado === 404) return null;
        throw e;
      }
    },

    async hijos(driveId, id) {
      let url = `/drives/${driveId}/items/${id}/children?$top=999&$select=${CAMPOS}`;
      const out = [];
      while (url) {
        const j = await pedir(url);
        out.push(...j.value);
        url = j['@odata.nextLink'] || null;
      }
      return out;
    },

    /** Descarga el contenido (bytes) de un item que trae su downloadUrl. */
    async bytes(item) {
      const url = item['@microsoft.graph.downloadUrl'];
      const r = url ? await f(url) : await pedir(`/drives/${item.parentReference.driveId}/items/${item.id}/content`, { crudo: true });
      if (!r.ok) throw new ErrorGraph(r.status, 'No se pudo descargar ' + item.name);
      return new Uint8Array(await r.arrayBuffer());
    },

    /** Sustituye el contenido de un archivo SOLO si nadie lo ha cambiado (eTag). */
    reemplazarSiNoCambio: (driveId, id, eTag, contenido, tipo = 'application/octet-stream') =>
      pedir(`/drives/${driveId}/items/${id}/content`, {
        metodo: 'PUT',
        cabeceras: { 'If-Match': eTag, 'Content-Type': tipo },
        cuerpo: contenido,
      }),

    /** Crea un archivo NUEVO. Si ya existe uno con ese nombre falla (409): nunca sobrescribe. */
    crearNuevo: (driveId, carpetaId, rel, contenido, tipo = 'application/octet-stream') =>
      pedir(`/drives/${driveId}/items/${carpetaId}:/${ruta(rel)}:/content?@microsoft.graph.conflictBehavior=fail`, {
        metodo: 'PUT',
        cabeceras: { 'Content-Type': tipo },
        cuerpo: contenido,
      }),

    async miniatura(driveId, itemId, tam = 'large') {
      const j = await pedir(`/drives/${driveId}/items/${itemId}/thumbnails?$select=${tam}`);
      return j.value?.[0]?.[tam]?.url || null;
    },
  };
}
