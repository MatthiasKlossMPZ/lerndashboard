// src/helpers.js
export function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Weitere Hilfsfunktionen können hier später hin
export function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE');
}

console.log('✅ helpers.js geladen');