// UUID generation utility

/**
 * Generate a random UUID v4
 * @returns A UUID v4 string
 */
export function generateUUID(): string {
  // This is a simple implementation of UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check if a string is a valid UUID
 * @param id The string to check
 * @returns True if the string is a valid UUID
 */
export function isUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Convert any string ID to a UUID format
 * If the ID is already a UUID, it will be returned as is
 * Otherwise, a new UUID will be generated
 * @param id The ID to convert
 * @returns A UUID string
 */
export function ensureUUID(id: string | undefined): string {
  if (!id || !isUUID(id)) {
    return generateUUID();
  }
  return id;
}