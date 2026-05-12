// src/stats.js
console.log('🚀 stats.js START');

import { store } from './state.js';
import { getFilteredResources } from './ui/filters.js';
import { applyFilters } from './resources.js';
import { showFancyAlert } from './ui/modals.js';

console.log('✅ stats.js erfolgreich geladen');

// ====================== FÄCHER-STATISTIK ======================
export function updateSubjectStats() {
    const container = document.getElementById('statsFach');
    if (!container) return;

    const total = store.resources.length;
    const stats = calculateSubjectStats();

    let html = `
        <div style="text-align:center; margin-bottom:12px; font-weight:600; color:var(--text-light);">
            Gesamt: <strong style="color:var(--primary); font-size:18px;">${total}</strong> Ressourcen
        </div>
        <div class="stats">
        
    `;

    Object.entries(stats).forEach(([subject, data]) => {
        const percentage = total > 0 ? Math.round((data.count / total) * 100) : 0;
        html += `
            <div class="stat-card">
                <strong>${subject}</strong>
                <span>${data.count}</span>
                <small>${data.favorites} Favoriten • ${percentage}%</small>
                <div class="stat-bar">
                    <div class="bar-container">
                        <div class="bar" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    });

    if (total === 0) {
        html += `<p style="text-align:center; padding:30px 10px; color:#888;">Noch keine Ressourcen vorhanden</p>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ====================== OBERE 4 STAT-KACHELN (Gesamt, Favoriten, Tools, Fächer) ======================
export function updateTopStats() {
    const filtered = getFilteredResources();

    console.log('📊 updateTopStats() aufgerufen – gefiltert:', filtered.length);

    // Gesamt
    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = filtered.length || 0;

    // Favoriten
    const favEl = document.getElementById('statFavorites');
    if (favEl) favEl.textContent = filtered.filter(r => r.favorite).length || 0;

    // Tools
    const toolsEl = document.getElementById('statTools');
    if (toolsEl) {
        const uniqueTools = [...new Set(filtered.map(r => r.tool).filter(Boolean))].length;
        toolsEl.textContent = uniqueTools || 0;
    }

    // Fächer
    const subjectsEl = document.getElementById('statSubjects');
    if (subjectsEl) {
        const uniqueSubjects = [...new Set(filtered.map(r => r.subject).filter(Boolean))].length;
        subjectsEl.textContent = uniqueSubjects || 0;
    }
}

function calculateSubjectStats() {
    const stats = {};
    store.resources.forEach(resource => {
        const subject = resource.subject || 'Sonstige';
        if (!stats[subject]) stats[subject] = { count: 0, favorites: 0 };
        stats[subject].count++;
        if (resource.favorite) stats[subject].favorites++;
    });
    return Object.fromEntries(
        Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
    );
}

// ====================== SPEICHERANZEIGE ======================
export function updateStorageIndicator() {
    const usageEl = document.getElementById('storageUsage');
    const barEl = document.getElementById('storageBar');
    const percentEl = document.getElementById('storagePercent');
    if (!usageEl || !barEl) return;

    try {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length * 2);
            }
        }
        const mb = (total / 1024 / 1024).toFixed(2);
        const percent = Math.min(Math.round((total / (5 * 1024 * 1024)) * 100), 100);

        usageEl.textContent = `${mb} MB`;
        barEl.style.width = `${percent}%`;

        if (percentEl) {
            percentEl.textContent = `${percent}% von ~5 MB`;
            percentEl.style.color = percent > 80 ? '#e74c3c' : '#27ae60';
        }
    } catch (e) {
        console.warn('Speicheranzeige konnte nicht berechnet werden', e);
    }
}

// ====================== LEVEL-MODUS + MIGRATION ======================
export function initLevelMode() {
    const saved = localStorage.getItem('levelMode');
    if (saved) {
        store.levelMode = saved;
        populateLevelFilter();
        updateLevelModeButtons();
    } else {
        showInitialLevelModeModal();
    }
}

function showInitialLevelModeModal() {
    // Nur anzeigen, wenn wirklich noch nichts im localStorage steht
    if (localStorage.getItem('levelMode')) {
        console.log('✅ Level-Modus bereits im localStorage gesetzt');
        return;
    }

    const message = `
        <strong>Willkommen zum LernDashboard!</strong><br><br>
        Welchen Niveaustufen-Modus möchtest du verwenden?<br><br>
        <strong>5 Stufen</strong> = feinere Abstufung (empfohlen)<br>
        <strong>3 Stufen</strong> = einfacher für schnelle Übersicht
    `;

    if (typeof showFancyAlert === 'function') {
        showFancyAlert(
            'Niveaustufen-Modus wählen',
            'info',
            message,
            () => changeLevelMode(5),
            () => changeLevelMode(3)
        );
    } else {
        if (confirm('5 Niveaustufen verwenden? (Abbrechen = 3 Stufen)')) {
            changeLevelMode(5);
        } else {
            changeLevelMode(3);
        }
    }
}

export function changeLevelMode(newMode) {
    newMode = String(newMode); // Sicherheit
    const oldMode = store.levelMode || '5';

    if (oldMode === newMode) {
        updateLevelModeButtons(); // nur visuelle Aktualisierung
        return;
    }

    // ... (der Rest der bestehenden Funktion bleibt gleich bis zum Ende)

    const direction = oldMode === '5' && newMode === '3'
        ? "5 → 3 Stufen:<br>• Stufen 1+2 → Stufe 1<br>• Stufe 3 → Stufe 2<br>• Stufen 4+5 → Stufe 3"
        : "3 → 5 Stufen:<br>• Stufe 1 → Stufe 1<br>• Stufe 2 → Stufe 3<br>• Stufe 3 → Stufe 5";

    const message = `
        <strong>Niveaustufen-Modus ändern?</strong><br><br>
        Von <strong>${oldMode}</strong> auf <strong>${newMode}</strong> Stufen<br><br>
        ${direction}<br><br>
        <span style="color:#e74c3c;font-weight:600;">Alle Ressourcen werden automatisch angepasst.</span>
    `;

    if (typeof showFancyAlert === 'function') {
        showFancyAlert(
            `Wechsel zu ${newMode} Niveaustufen`,
            'warning',
            message,
            () => executeLevelChange(oldMode, newMode)
        );
    } else {
        if (confirm(`Niveaustufen-Modus von ${oldMode} auf ${newMode} ändern?\n\n${direction.replace(/<br>/g, '\n')}\n\nAlle Ressourcen werden automatisch angepasst.`)) {
            executeLevelChange(oldMode, newMode);
        }
    }
}

function executeLevelChange(oldMode, newMode) {
    // Safety-Backup
    createSafetyBackup(`Level-Modus-Wechsel: ${oldMode} → ${newMode}`);

    // Migration
    store.resources = migrateResourceLevels(store.resources, oldMode, newMode);
    store.levelMode = newMode;
    localStorage.setItem('levelMode', newMode);

    store.save();
    populateLevelFilter();
    updateLevelModeButtons();
    applyFilters();

    if (typeof showFancyAlert === 'function') {
        showFancyAlert(
            '✅ Erfolgreich umgestellt!',
            'success',
            `Alle Ressourcen wurden auf ${newMode} Niveaustufen angepasst.`
        );
    } else {
        alert(`✅ Erfolgreich auf ${newMode} Niveaustufen umgestellt!`);
    }
}

function migrateResourceLevels(resources, oldMode, newMode) {
    if (oldMode === newMode) return resources;
    return resources.map(r => {
        if (!r.level) return r;
        let num = getLevelNumber(r.level);
        if (!num) return r;

        let newNum = num;
        if (oldMode === '5' && newMode === '3') {
            if (num <= 2) newNum = 1;
            else if (num === 3) newNum = 2;
            else newNum = 3;
        } else if (oldMode === '3' && newMode === '5') {
            if (num === 1) newNum = 1;
            else if (num === 2) newNum = 3;
            else if (num === 3) newNum = 5;
        }
        r.level = `Niveaustufe ${newNum}`;
        return r;
    });
}

function getLevelNumber(levelStr) {
    if (!levelStr) return 0;
    const match = levelStr.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
}

function getLevelOptions() {
    const count = parseInt(store.levelMode || 5);
    return Array.from({ length: count }, (_, i) => `Niveaustufe ${i + 1}`);
}

function updateLevelModeButtons() {
    const btn3 = document.getElementById('levelBtn3');
    const btn5 = document.getElementById('levelBtn5');
    const currentText = document.getElementById('currentLevelText');

    if (btn3) {
        btn3.style.background = (store.levelMode === '3' || store.levelMode === 3) ? '#00bfff' : '#e2e8f0';
        btn3.style.color = (store.levelMode === '3' || store.levelMode === 3) ? 'white' : '#475569';
    }
    if (btn5) {
        btn5.style.background = (store.levelMode === '5' || store.levelMode === 5) ? '#6b46c1' : '#e2e8f0';
        btn5.style.color = (store.levelMode === '5' || store.levelMode === 5) ? 'white' : '#475569';
    }
    if (currentText) currentText.textContent = `${store.levelMode} Niveaustufen`;
}

function populateLevelFilter() {
    console.log('📊 Level-Filter aktualisiert für', store.levelMode, 'Stufen');
}

// ====================== SAFETY BACKUPS ======================
const MAX_BACKUPS = 6;

export function createSafetyBackup(actionName = 'Unbekannte Aktion') {
    const backup = {
        timestamp: Date.now(),
        date: new Date().toLocaleString('de-DE'),
        action: actionName,
        resourceCount: store.resources.length,
        resources: JSON.parse(JSON.stringify(store.resources)),
        levelMode: store.levelMode
    };

    let backups = JSON.parse(localStorage.getItem('safetyBackups') || '[]');
    backups.unshift(backup);
    if (backups.length > MAX_BACKUPS) backups.pop();

    localStorage.setItem('safetyBackups', JSON.stringify(backups));
    console.log(`💾 Safety-Backup erstellt: ${actionName}`);
}

export function showRestoreDialog() {
    const backups = JSON.parse(localStorage.getItem('safetyBackups') || '[]');
    
    if (backups.length === 0) {
        showFancyAlert('Keine Backups', 'info', 'Es sind noch keine Notfall-Backups vorhanden.');
        return;
    }

    // Alten Dialog sicher entfernen
    document.querySelectorAll('dialog#restoreDialog').forEach(d => d.remove());

    const modal = document.createElement('dialog');
    modal.id = 'restoreDialog';
    modal.style.cssText = `
        position: fixed;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 720px;
        width: 94%;
        max-height: 88vh;
        border: none;
        border-radius: 20px;
        padding: 0;
        box-shadow: 0 30px 90px rgba(0,0,0,0.55);
        background: white;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        z-index: 40000;
    `;

    let html = `
        <!-- Header -->
        <div style="padding:28px 24px; text-align:center; background: linear-gradient(135deg, #fff9e6, #fef3c7); flex-shrink:0;">
            <div style="font-size:52px; margin-bottom:8px;">🛡️</div>
            <h2 style="margin:0; color:#d97706; font-size:24px;">Ressourcen wiederherstellen</h2>
            <p style="margin:8px 0 0; color:#b45309; font-size:15px;">Notfall-Backups (letzte ${backups.length})</p>
        </div>

        <!-- Scroll-Bereich -->
        <div style="flex: 1; overflow-y: auto; padding: 16px 20px; background: #f8f9fa;">
    `;

    backups.forEach((backup, i) => {
        const date = new Date(backup.timestamp);
        const dateStr = date.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
        const timeStr = date.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });

        html += `
            <div style="background:white; border-radius:14px; padding:20px; margin:12px 0; 
                        border-left:6px solid #f59e0b; box-shadow:0 4px 15px rgba(0,0,0,0.08);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
                    <div>
                        <strong style="font-size:17.5px;">${dateStr}, ${timeStr}</strong><br>
                        <span style="color:#555;">${backup.action || 'Automatisches Backup'}</span><br>
                        <span style="color:#d97706; font-weight:700;">${backup.resourceCount || backup.resources?.length || 0} Ressourcen</span>
                    </div>
                    <button onclick="restoreFromSafetyBackup(${i}); closeRestoreDialog()" 
                            style="background:#ef4444; color:white; border:none; border-radius:12px; 
                                   padding:14px 32px; font-weight:700; cursor:pointer; min-width:160px; flex-shrink:0;">
                        Wiederherstellen
                    </button>
                </div>
            </div>
        `;
    });

    html += `
        </div>

        <!-- Footer -->
        <div style="padding:24px; text-align:center; background:#f1f5f9; border-top:1px solid #e2e8f0; flex-shrink:0;">
            <button onclick="closeRestoreDialog()" 
                    style="padding:14px 42px; background:#64748b; color:white; border:none; 
                           border-radius:12px; font-weight:600; cursor:pointer; font-size:16px;">
                Abbrechen
            </button>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);
    modal.showModal();

    // ESC-Taste + Klick außerhalb
    modal.addEventListener('close', () => {
        setTimeout(() => modal.remove(), 300);
    });
}

// Hilfsfunktion für sauberes Schließen
window.closeRestoreDialog = function() {
    const dialog = document.getElementById('restoreDialog');
    if (dialog) {
        dialog.close();
        setTimeout(() => dialog.remove(), 400);
    }
};

window.restoreFromSafetyBackup = function(index) {
    const backups = JSON.parse(localStorage.getItem('safetyBackups') || '[]');
    if (!backups[index]) return;

    const backup = backups[index];

    if (confirm(`Wirklich auf den Backup vom ${backup.date} mit ${backup.resourceCount} Ressourcen zurücksetzen?`)) {
        store.resources = JSON.parse(JSON.stringify(backup.resources || []));
        if (backup.levelMode) store.levelMode = backup.levelMode;

        store.save();
        applyFilters();
        updateSubjectStats();
        updateStorageIndicator();
        updateTopStats?.();

        showFancyAlert('✅ Wiederhergestellt!', 'success', `Backup vom ${backup.date} wurde geladen.`);
        closeRestoreDialog();
    }
};

// ====================== WINDOW BINDINGS ======================
window.changeLevelMode = changeLevelMode;
window.showRestoreDialog = showRestoreDialog;
window.restoreFromSafetyBackup = restoreFromSafetyBackup;
window.updateSubjectStats = updateSubjectStats;
window.updateStorageIndicator = updateStorageIndicator;
window.showInitialLevelModeModal = showInitialLevelModeModal;
window.updateTopStats = updateTopStats;

console.log('✅ stats.js vollständig initialisiert (mit Restore-Dialog + TopStats)');