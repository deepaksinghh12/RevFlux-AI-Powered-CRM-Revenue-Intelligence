/**
 * Escapes special regex characters in search strings to prevent ReDoS (Regular Expression Denial of Service).
 * @param {string} text - User provided search input
 * @returns {string} Sanitized string safe for new RegExp()
 */
export function escapeRegex(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
