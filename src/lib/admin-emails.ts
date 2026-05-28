const FALLBACK_ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']

export function getAdminEmailList(): string[] {
    const configured = process.env.ADMIN_EMAILS
        ?.split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean)

    if (configured && configured.length > 0) {
        return configured
    }

    return FALLBACK_ADMIN_EMAILS
}

export function isAdminEmail(email?: string | null): boolean {
    if (!email) return false
    return getAdminEmailList().includes(email.trim().toLowerCase())
}
