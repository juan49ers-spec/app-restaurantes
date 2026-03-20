/**
 * Google Drive REST Client (lightweight, no googleapis SDK)
 * 
 * Usa un Service Account para autenticarse vía JWT.
 * Operaciones: listar archivos, descargar, mover entre carpetas.
 */

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    createdTime: string;
    size?: string;
    parents?: string[];
}

interface ServiceAccountKey {
    client_email: string;
    private_key: string;
    token_uri: string;
}

// ─── JWT Auth (Service Account) ──────────────────────────────────────────────

/**
 * Genera un JWT firmado para autenticarse con Google APIs.
 * Usa Web Crypto API (disponible en Edge Runtime de Vercel).
 */
async function getAccessToken(): Promise<string> {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no está configurada");
    }

    const key: ServiceAccountKey = JSON.parse(
        Buffer.from(keyJson, "base64").toString("utf-8")
    );

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: key.client_email,
        scope: "https://www.googleapis.com/auth/drive",
        aud: key.token_uri,
        iat: now,
        exp: now + 3600,
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Importar la clave privada RSA
    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(key.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        new TextEncoder().encode(unsignedToken)
    );

    const signedToken = `${unsignedToken}.${base64url(signature)}`;

    // Intercambiar JWT por access token
    const tokenResponse = await fetch(key.token_uri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signedToken,
        }),
    });

    if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        throw new Error(`Error obteniendo access token de Google: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

// ─── Drive Operations ────────────────────────────────────────────────────────

/**
 * Lista los archivos nuevos en una carpeta de Drive.
 * Filtra por imágenes y PDFs (los tipos que procesamos).
 */
export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
    const token = await getAccessToken();

    const mimeFilter = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ].map(m => `mimeType='${m}'`).join(" or ");

    const query = `'${folderId}' in parents and (${mimeFilter}) and trashed=false`;

    const url = new URL(`${DRIVE_API_BASE}/files`);
    url.searchParams.set("q", query);
    url.searchParams.set("fields", "files(id,name,mimeType,createdTime,size,parents)");
    url.searchParams.set("orderBy", "createdTime asc");
    url.searchParams.set("pageSize", "50");

    const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error listando archivos de Drive: ${errText}`);
    }

    const data = await response.json();
    return data.files || [];
}

/**
 * Descarga el contenido binario de un archivo de Drive.
 * Retorna un Buffer con los bytes del archivo.
 */
export async function downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const token = await getAccessToken();

    // Primero obtener metadata para saber el mimeType
    const metaResponse = await fetch(`${DRIVE_API_BASE}/files/${fileId}?fields=mimeType,name`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!metaResponse.ok) {
        throw new Error(`Error obteniendo metadata del archivo ${fileId}`);
    }

    const meta = await metaResponse.json();

    // Descargar el contenido
    const downloadResponse = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadResponse.ok) {
        throw new Error(`Error descargando archivo ${fileId}`);
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: meta.mimeType,
    };
}

/**
 * Mueve un archivo a otra carpeta en Drive.
 * Usa PATCH para cambiar el parent del archivo.
 */
export async function moveFile(fileId: string, currentParentId: string, targetFolderId: string): Promise<void> {
    const token = await getAccessToken();

    const url = new URL(`${DRIVE_API_BASE}/files/${fileId}`);
    url.searchParams.set("addParents", targetFolderId);
    url.searchParams.set("removeParents", currentParentId);

    const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error moviendo archivo ${fileId}: ${errText}`);
    }
}

/**
 * Crea una subcarpeta dentro de una carpeta de Drive.
 * Se usa para crear la estructura año/mes dentro de PROCESADAS.
 */
export async function createSubfolder(parentFolderId: string, folderName: string): Promise<string> {
    const token = await getAccessToken();

    const response = await fetch(`${DRIVE_API_BASE}/files`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentFolderId],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error creando subcarpeta '${folderName}': ${errText}`);
    }

    const data = await response.json();
    return data.id;
}

/**
 * Busca una subcarpeta por nombre dentro de un parent.
 * Retorna el ID si existe, null si no.
 */
export async function findSubfolder(parentFolderId: string, folderName: string): Promise<string | null> {
    const token = await getAccessToken();

    const query = `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const url = new URL(`${DRIVE_API_BASE}/files`);
    url.searchParams.set("q", query);
    url.searchParams.set("fields", "files(id)");

    const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.files?.[0]?.id || null;
}

/**
 * Obtiene o crea la subcarpeta año/mes dentro de PROCESADAS.
 * Ej: 2_PROCESADAS/2026/03/
 */
export async function getOrCreateDateFolder(processedFolderId: string, date: Date): Promise<string> {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    // Buscar o crear carpeta del año
    let yearFolderId = await findSubfolder(processedFolderId, year);
    if (!yearFolderId) {
        yearFolderId = await createSubfolder(processedFolderId, year);
    }

    // Buscar o crear carpeta del mes
    let monthFolderId = await findSubfolder(yearFolderId, month);
    if (!monthFolderId) {
        monthFolderId = await createSubfolder(yearFolderId, month);
    }

    return monthFolderId;
}

// ─── Crypto Helpers ──────────────────────────────────────────────────────────

function base64url(input: string | ArrayBuffer): string {
    const bytes = typeof input === "string"
        ? new TextEncoder().encode(input)
        : new Uint8Array(input);

    let binary = "";
    bytes.forEach(b => binary += String.fromCharCode(b));

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
    const base64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\n/g, "");

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Prevent importing unused DRIVE_UPLOAD_BASE warning
void DRIVE_UPLOAD_BASE;
