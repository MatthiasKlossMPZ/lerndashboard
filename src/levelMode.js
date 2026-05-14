/**
 * Lerndashboard
 * 
 * Copyright (c) 2025-2026 Matthias Kloss
 * 
 * This file is part of Lerndashboard and licensed under the MIT License.
 * See the LICENSE file in the project root for full license text.
 */

// src/levelMode.js

// ====================== EXPORTS ======================
export function getLevelMode() {
    const saved = localStorage.getItem('levelMode');
    return saved || '5';
}

export function getLevelOptions() {
    const count = parseInt(getLevelMode());
    return Array.from({ length: count }, (_, i) => `Niveaustufe ${i + 1}`);
}

export function changeLevelMode(newMode) {
    console.warn('changeLevelMode noch nicht implementiert');
    console.log(`Level-Modus gewechselt zu: ${newMode}`);
}

