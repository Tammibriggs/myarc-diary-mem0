/**
 * Sanitize text before sending to external AI APIs.
 * Strips common PII patterns (emails, phones, URLs, SSN-like, credit-card-like).
 */
export function sanitizeForAI(text: string): string {
    let sanitized = text;

    // Email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Phone numbers (various formats)
    sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '[PHONE]');

    // URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s<>"']+/g, '[URL]');

    // SSN-like patterns (xxx-xx-xxxx)
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ID]');

    // Credit card-like patterns (16 digits with optional separators)
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');

    // IP addresses
    sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

    return sanitized;
}
