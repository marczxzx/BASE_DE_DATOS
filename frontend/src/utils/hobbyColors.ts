// Mapeo de categorías de hobby a colores para visualización en el mapa

export const HOBBY_CATEGORY_COLORS: Record<string, string> = {
  // Deportes - Tonos rojos/naranjas (energía, acción)
  'deportes': '#ff6b6b',

  // Actividades al aire libre - Tonos verdes (naturaleza)
  'actividades al aire libre': '#51cf66',

  // Actividades culturales - Tonos morados (cultura, arte)
  'actividades culturales': '#9775fa',

  // Artes - Tonos azules (creatividad)
  'artes': '#4c6ef5',

  // Manualidades - Tonos amarillos/dorados (creatividad manual)
  'manualidades': '#ffd43b',

  // Coleccionismo - Tonos marrones/beige (colección, antigüedad)
  'coleccionismo': '#a0785a',

  // Juegos recreativos - Tonos naranjas (diversión)
  'juegos recreativos': '#ff922b',

  // Actividades del hogar - Tonos cyan/teal (hogar, confort)
  'actividades del hogar': '#20c997',

  // Actividad social - Tonos rosas (social, amistad)
  'actividad social': '#f06595',

  // Educativo - Tonos azul oscuro (conocimiento)
  'educativo': '#1c7ed6',

  // Por defecto (sin hobby o categoría desconocida) - Gris
  'default': '#868e96',
};

/**
 * Obtiene el color para una categoría de hobby
 * @param categoriaNombre - Nombre de la categoría de hobby (normalizado a minúsculas)
 * @returns Color hexadecimal
 */
export function getHobbyColor(categoriaNombre: string | null | undefined): string {
  if (!categoriaNombre) {
    return HOBBY_CATEGORY_COLORS.default;
  }

  const normalized = categoriaNombre.toLowerCase().trim();
  return HOBBY_CATEGORY_COLORS[normalized] || HOBBY_CATEGORY_COLORS.default;
}
