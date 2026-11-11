export const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect width='600' height='800' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='47%25' dominant-baseline='middle' text-anchor='middle' fill='%230f172a' font-family='Georgia, serif' font-size='36' font-weight='700' letter-spacing='6'%3EVOGNIX%3C/text%3E%3Ctext x='50%25' y='53%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14' letter-spacing='3'%3EFASHION ATELIER%3C/text%3E%3C/svg%3E";

export function handleImageError(event) {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = FALLBACK_IMAGE;
}
