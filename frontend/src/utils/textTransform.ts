/**
 * Transforma un texto a formato título (primera letra de cada palabra en mayúscula).
 *
 * @param text - Texto a transformar
 * @returns Texto en formato título
 *
 * @example
 * capitalizeWords('juan pérez') // 'Juan Pérez'
 * capitalizeWords('MARIA GARCIA') // 'Maria Garcia'
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
