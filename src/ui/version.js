// src/ui/version.js
const VERSION = '1.1.84';

export function updateVersionDisplay() {
    const el = document.getElementById('versionInfo');
    if (el) {
        el.innerHTML = `© 2026 <strong>Matthias Kloß</strong> | Version ${VERSION}`;
        console.log('📌 Version angezeigt');
    }
}