export const ensureArray = (arg?: string | string[]): string[] => {
  if (!arg) {
    return [];
  }
  return Array.isArray(arg) ? arg : [arg];
};
