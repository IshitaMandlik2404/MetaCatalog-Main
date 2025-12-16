
// normalize.js
function decodeAmpSafe(s) {
  // Normalize any HTML entity encodings to plain '&'
  return String(s || '')
    .replace(/&amp;amp;amp;/g, '&')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&');
}

function normalizeResult(result) {
  // Normalize various possible DB client return shapes
  return (
    (Array.isArray(result) && result) ||
    (result && Array.isArray(result.rows) && result.rows) ||
    (result && Array.isArray(result.data) && result.data) ||
    (result && typeof result.toArray === 'function' && result.toArray()) ||
    []
  );
}

module.exports = { decodeAmpSafe, normalizeResult };
