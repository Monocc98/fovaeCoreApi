export const getExternalConceptKeyFromCategory = (categoria: string): string => {
  if (!categoria) return '';
  const match = categoria.match(/\[(\d+)\]/);
  if (match) return match[1]; // el código numérico dentro de []
  return categoria.trim();    // fallback: texto completo
};