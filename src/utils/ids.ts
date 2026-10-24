export const createId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;
