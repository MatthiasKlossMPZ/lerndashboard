/**
 * Lerndashboard
 *
 * Copyright (c) 2025-2026 Matthias Kloss
 *
 * This file is part of Lerndashboard and licensed under the MIT License.
 * See the LICENSE file in the project root for full license text.
 */

// src/state.js

import { getProfileId } from './config/profiles.js';

function offerStorageBackup(resources, full) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const blob = new Blob([JSON.stringify({ resources }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lerndashboard-backup-${stamp}.json`;

    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;inset:0;z-index:40000;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px;';
    notice.innerHTML = `
        <div style="background:#fff;color:#222;max-width:460px;padding:28px;border-radius:16px;">
            <h3 style="margin:0 0 8px;">Speichern nicht möglich</h3>
            <p style="margin:0 0 18px;line-height:1.45;">
                ${full
                    ? 'Der Browser-Speicher ist voll. Der letzte Eintrag wurde nicht gesichert und ist nach dem Neuladen weg.'
                    : 'Die Daten konnten nicht gespeichert werden.'}
                Bitte alte Ressourcen löschen oder die Notfallkopien leeren und danach erneut speichern.
            </p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" id="storageBackupClose" style="padding:10px 16px;border:none;border-radius:10px;background:#95a5a6;color:#fff;">Schließen</button>
                <button type="button" id="storageBackupDownload" style="padding:10px 16px;border:none;border-radius:10px;background:#6b46c1;color:#fff;">Backup herunterladen</button>
            </div>
        </div>`;
    document.body.appendChild(notice);
    notice.querySelector('#storageBackupClose').onclick = () => notice.remove();
    notice.querySelector('#storageBackupDownload').onclick = () => {
        link.click();
        URL.revokeObjectURL(url);
        notice.remove();
    };
}

export const store = {
    resources: [],
    undoStack: [],
    schoolName: '',
    schoolType: getProfileId(),

    filters: {
        subject: '',
        grade: '',
        program: '',
        occupation: '',
        competence: '',
        level: '',
        tool: '',
        favorite: false,
        topic: ''
    },

    levelMode: '5',
    compactMode: true,
    selectedIds: new Set(),

    save() {
        try {
            localStorage.setItem('resources', JSON.stringify(this.resources));
            localStorage.setItem('schoolName', this.schoolName || '');
            return true;
        } catch (e) {
            console.error('Speicherfehler', e);
            const full = e && (e.name === 'QuotaExceededError' || e.code === 22);
            offerStorageBackup(this.resources, full);
            return false;
        }
    }
};

function readStored(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null || raw === '') return fallback;
        return JSON.parse(raw);
    } catch (e) {
        console.error('Beschädigte Daten, setze zurück:', key, e);
        localStorage.removeItem(key);
        return fallback;
    }
}

const savedResources = readStored('resources', []);
store.resources = Array.isArray(savedResources) ? savedResources : [];

const savedUndo = readStored('undoStack', []);
store.undoStack = Array.isArray(savedUndo) ? savedUndo : [];

store.schoolName = localStorage.getItem('schoolName') || '';
store.schoolType = getProfileId();

console.log('✅ state.js geladen');