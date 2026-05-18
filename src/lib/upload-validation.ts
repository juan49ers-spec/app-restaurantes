const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
] as const

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const

export function validateUploadedFile(file: File): { valid: true } | { valid: false; error: string } {
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: `Archivo demasiado grande (máx ${MAX_FILE_SIZE / 1024 / 1024}MB)` }
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
        return { valid: false, error: `Tipo de archivo no permitido: ${file.type}. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}` }
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
        return { valid: false, error: `Extensión no permitida: .${ext}` }
    }

    return { valid: true }
}

export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .slice(0, 255)
}
