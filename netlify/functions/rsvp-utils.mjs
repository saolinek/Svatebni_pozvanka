const normalizeText = (value, maxLength) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

export const normalizeSongs = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((song) => normalizeText(song, 160))
    .filter(Boolean)
    .slice(0, 5);
};
