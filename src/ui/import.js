// src/ui/import.js
import { store } from '../state.js';
import { getLevelMode } from '../levelMode.js';
import { applyFilters } from '../resources.js';
import { updateSubjectStats } from '../stats.js';
import { showFancyAlert } from './modals.js';
import { createSafetyBackup } from '../stats.js';

console.log('✅ Import-Modul vollständig geladen');

// ====================== HAUPT-EINSTIEG ======================
export function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const lower = file.name.toLowerCase();

        if (lower.endsWith('.json')) handleJSONImport(content);
        else if (lower.endsWith('.csv')) handleCSVImport(content);
        else showFancyAlert('Falsches Format', 'warning', 'Nur .json oder .csv Dateien werden unterstützt.');
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ====================== JSON & CSV ======================
function handleJSONImport(jsonString) {
    try {
        const backup = JSON.parse(jsonString);
        let imported = backup.resources || backup.data || (Array.isArray(backup) ? backup : []);

        if (!Array.isArray(imported) || imported.length === 0) {
            throw new Error("Keine Ressourcen gefunden");
        }

        const sourceLevels = parseInt(backup.levelMode || backup.numLevels || 5);
        const targetLevels = parseInt(getLevelMode() || 5);

        if (sourceLevels !== targetLevels && sourceLevels > 0) {
            imported = migrateImportedResources(imported, sourceLevels, targetLevels);
        }

        prepareImportData(imported);
    } catch (e) {
        console.error('JSON Parse Fehler:', e);
        showFancyAlert('JSON ungültig', 'error', 'Die Datei ist kein gültiges Backup.');
    }
}

// ====================== CSV IMPORT ======================
function handleCSVImport(csvString) {
    try {
        const lines = csvString.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
            return showFancyAlert('CSV leer', 'warning', 'Die Datei enthält keine Daten.');
        }

        // Header flexibel erkennen (auch mit Anführungszeichen oder leicht abweichenden Namen)
        let headers = parseCSVLine(lines[0]);
        headers = headers.map(h => h.trim().replace(/"/g, '').toLowerCase());

        const imported = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 2) continue;

            const row = {};
            headers.forEach((header, idx) => {
                let val = (values[idx] || '').trim().replace(/^"|"$/g, '');
                // Mögliche Spaltennamen abfangen
                if (header.includes('thema') || header.includes('topic')) row.topic = val;
                else if (header.includes('fach') || header.includes('subject')) row.subject = val;
                else if (header.includes('klasse') || header.includes('grade')) row.grade = val;
                else if (header.includes('kompetenz') || header.includes('competence')) row.competence = val;
                else if (header.includes('niveau') || header.includes('level')) row.level = val;
                else if (header.includes('tool') || header.includes('hilfsmittel')) row.tool = val;
                else if (header.includes('beschreibung') || header.includes('description')) row.description = val;
            });

            if (row.topic || row.subject) {
                imported.push({
                    topic: row.topic || '(Ohne Thema)',
                    subject: row.subject || '',
                    grade: row.grade || '',
                    competence: row.competence || '',
                    level: row.level || '',
                    tool: row.tool || '',
                    description: row.description || '',
                    favorite: false,
                    lastModified: new Date().toISOString().slice(0, 16).replace('T', ' ')
                });
            }
        }

        if (imported.length === 0) {
            return showFancyAlert('Keine gültigen Einträge', 'warning', 'Prüfe, ob die CSV die Spalten "Thema", "Unterrichtsfach" etc. enthält.');
        }

        console.log(`📥 ${imported.length} CSV-Einträge erkannt`);
        prepareImportData(imported);
    } catch (e) {
        console.error('CSV Parse Fehler:', e);
        showFancyAlert('CSV-Fehler', 'error', 'Die Datei konnte nicht gelesen werden.');
    }
}

// ====================== VORBEREITUNG ======================
function prepareImportData(importedResources) {
    createSafetyBackup('Vor Import');

    const toImport = [];
    const similar = [];
    const duplicates = [];

    importedResources.forEach(entry => {
        const n = {
            topic: String(entry.topic || '').trim(),
            subject: String(entry.subject || '').trim(),
            grade: String(entry.grade || '').trim(),
            competence: String(entry.competence || '').trim(),
            level: String(entry.level || '').trim(),
            tool: String(entry.tool || '').trim(),
            description: String(entry.description || '').trim()
        };

        const normalizeTool = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const isExactDuplicate = store.resources.some(r =>
            r.topic === n.topic && r.subject === n.subject && r.grade === n.grade &&
            r.competence === n.competence && r.tool === n.tool && r.description === n.description
        );

        if (isExactDuplicate) { duplicates.push(n); return; }

        const similarMatch = store.resources.find(r =>
            r.subject === n.subject && r.grade === n.grade && normalizeTool(r.tool) === normalizeTool(n.tool)
        );

        if (similarMatch) {
            similar.push({ ...n, existing: similarMatch, similarityScore: similarity(similarMatch.topic || '', n.topic) });
            return;
        }

        toImport.push(n);
    });

    showUnifiedImportDecisionDialog(toImport, similar, duplicates.length);
}

function showUnifiedImportDecisionDialog(newOnes, similarOnes, duplicateCount = 0) {
    console.log('🚀 showUnifiedImportDecisionDialog aufgerufen mit:', { newOnes: newOnes?.length, similarOnes: similarOnes?.length, duplicates: duplicateCount });

    if ((newOnes?.length || 0) === 0 && (similarOnes?.length || 0) === 0) {
        showFancyAlert('Import abgeschlossen', 'info', `${duplicateCount} Duplikate ignoriert.`);
        return;
    }

    const modal = document.createElement('dialog');
    modal.id = 'importDecisionDialog';
    modal.style.cssText = `
        position: fixed; 
        top: 42%; 
        left: 50%; 
        transform: translate(-50%, -50%);
        max-width: 1180px; 
        width: 96%; 
        max-height: 88vh; 
        height: auto;
        border: none; 
        border-radius: 20px; 
        padding: 0; 
        overflow: hidden;
        box-shadow: 0 30px 90px rgba(0,0,0,0.55); 
        background: var(--card);
        display: flex; 
        flex-direction: column; 
        z-index: 30000;
    `;

    modal.innerHTML = `
        <div style="padding:28px 32px 20px; border-bottom:1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc, #f1f5f9); flex-shrink:0;">
            <h2 style="margin:0 0 8px 0; color:var(--primary); font-size:22px;">Import verarbeiten</h2>
            <p style="margin:0; font-size:15.2px; color:var(--text-light);">
                ${(newOnes?.length || 0)} neue • ${(similarOnes?.length || 0)} ähnliche • 
                <span style="color:#e74c3c;font-weight:600;">${duplicateCount} Duplikate ignoriert</span>
            </p>
        </div>

        <div style="flex:1; overflow-y:auto; padding:0; background:#fafafa; max-height: calc(88vh - 210px);">
            <table style="width:100%; border-collapse:collapse; font-size:14.8px; table-layout:fixed;">
                <thead style="position:sticky; top:0; z-index:30; background:#6b46c1;">
                    <tr>
                        <th style="padding:16px 8px; width:85px; text-align:center; background:#6b46c1; color:white; position:relative;">Importieren</th>
                        <th style="padding:16px 8px; width:95px; text-align:center; background:#6b46c1; color:white; position:relative;">Überschreiben</th>
                        <th style="padding:16px 8px; background:#6b46c1; color:white; position:relative;">Thema</th>
                        <th style="padding:16px 8px; width:220px; background:#6b46c1; color:white; position:relative;">Hinweis</th>
                        <th style="padding:16px 8px; background:#6b46c1; color:white; position:relative;">Fach • Klasse • Tool</th>
                    </tr>
                    <!-- Schatten für bessere Trennung -->
                    <tr style="height:0;">
                        <td colspan="5" style="height:0; padding:0; margin:0; border:none; box-shadow:0 4px 8px rgba(0,0,0,0.15);"></td>
                    </tr>
                </thead>
                <tbody id="importTableBody" style="background:#fafafa;"></tbody>
            </table>
        </div>

        <div style="padding:24px 32px; background:#f8f9fa; border-top:1px solid #e2e8f0; display:flex; gap:14px; justify-content:flex-end; flex-shrink:0;">
            <button id="cancelImportBtn" style="padding:13px 34px; background:#64748b; color:white; border:none; border-radius:12px; font-weight:600; cursor:pointer;">Abbrechen</button>
            <button id="confirmImportBtn" style="padding:13px 38px; background:var(--primary); color:white; border:none; border-radius:12px; font-weight:700; cursor:pointer;">
                ✅ Import durchführen
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.showModal();

    const tbody = modal.querySelector('#importTableBody');
    const confirmBtn = modal.querySelector('#confirmImportBtn');

    // === NEUE RESSOURCEN ===
    (newOnes || []).forEach((item, i) => {
        const row = document.createElement('tr');
        row.style.background = '#f0fdf4';
        row.innerHTML = `
            <td style="text-align:center; padding:12px 8px;">
                <input type="checkbox" class="import-checkbox" data-index="${i}" checked>
            </td>
            <td style="text-align:center; padding:12px 8px; color:#aaa;">—</td>
            <td style="padding:12px 8px; font-weight:600;">${escapeHtml(item.topic || '(Kein Thema)')}</td>
            <td style="padding:12px 8px; color:#27ae60; font-weight:600;">NEU</td>
            <td style="padding:12px 8px; font-size:13.5px; color:#555;">
                ${escapeHtml(item.subject || '-')} • ${escapeHtml(item.grade || '-')} • ${escapeHtml(item.tool || '-')}
            </td>
        `;
        tbody.appendChild(row);
    });

    // === ÄHNLICHE RESSOURCEN ===
    (similarOnes || []).forEach((item, i) => {
        const perc = Math.round((item.similarityScore || 0) * 100);
        const diffHint = getDifferenceHint(item.existing, item);

        const row = document.createElement('tr');
        row.style.background = '#fff3e0';
        row.innerHTML = `
            <td style="text-align:center; padding:12px 8px;">
                <input type="checkbox" class="import-checkbox" data-index="${newOnes.length + i}" checked>
            </td>
            <td style="text-align:center; padding:12px 8px;">
                <input type="checkbox" class="overwrite-checkbox" data-index="${i}">
            </td>
            <td style="padding:12px 8px; font-weight:600; color:#e67e22;">${escapeHtml(item.topic)}</td>
            <td style="padding:12px 8px; color:#e74c3c; font-weight:600; line-height:1.4;">
                ÄHNLICH<br>
                <small style="color:#c0392b;">Ähnlichkeit: ${perc}%</small><br>
                <small style="color:#e67e22;">${diffHint}</small>
            </td>
            <td style="padding:12px 8px; font-size:13.5px; color:#555;">
                ${escapeHtml(item.subject)} • ${item.grade} • ${escapeHtml(item.tool || '-')}
                <div style="margin-top:4px; font-size:13px; color:#c0392b;">
                    Vorhanden: ${escapeHtml(item.existing.topic)}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Button-Logik (unverändert)
    function updateConfirmButton() {
        const importCbs = modal.querySelectorAll('.import-checkbox');
        const overwriteCbs = modal.querySelectorAll('.overwrite-checkbox');

        let toAdd = 0;
        let toOverwrite = 0;

        (newOnes || []).forEach((_, i) => {
            if (importCbs[i]?.checked) toAdd++;
        });

        (similarOnes || []).forEach((_, i) => {
            const idx = (newOnes?.length || 0) + i;
            if (importCbs[idx]?.checked) {
                if (overwriteCbs[i]?.checked) toOverwrite++;
                else toAdd++;
            }
        });

        let text = '✅ Import durchführen';
        if (toAdd + toOverwrite > 0) {
            text = `✅ ${toAdd} hinzufügen`;
            if (toOverwrite > 0) text += ` • ${toOverwrite} überschreiben`;
        }
        confirmBtn.textContent = text;
    }

    modal.addEventListener('change', updateConfirmButton);
    updateConfirmButton();

    modal.querySelector('#cancelImportBtn').onclick = () => modal.remove();
    modal.querySelector('#confirmImportBtn').onclick = () => {
        performImport(newOnes, similarOnes, modal);
        modal.remove();
    };

    modal.addEventListener('close', () => modal.remove());


    // === DYNAMISCHE BUTTON-AKTUALISIERUNG ===
    function updateConfirmButton() {
        const importCbs = modal.querySelectorAll('.import-checkbox');
        const overwriteCbs = modal.querySelectorAll('.overwrite-checkbox');

        let toAdd = 0;
        let toOverwrite = 0;

        newOnes.forEach((_, i) => {
            if (importCbs[i]?.checked) toAdd++;
        });

        similarOnes.forEach((_, i) => {
            const idx = newOnes.length + i;
            if (importCbs[idx]?.checked) {
                if (overwriteCbs[i]?.checked) toOverwrite++;
                else toAdd++;
            }
        });

        let text = '✅ Import durchführen';
        if (toAdd + toOverwrite > 0) {
            text = `✅ ${toAdd} hinzufügen`;
            if (toOverwrite > 0) text += ` • ${toOverwrite} überschreiben`;
        }
        confirmBtn.textContent = text;
    }

    // Event Listener für Checkbox-Änderungen
    modal.addEventListener('change', updateConfirmButton);
    updateConfirmButton(); // Initial aufrufen

    // Buttons
    modal.querySelector('#cancelImportBtn').onclick = () => modal.remove();
    modal.querySelector('#confirmImportBtn').onclick = () => {
        performImport(newOnes, similarOnes, modal);
        modal.remove();
    };

    modal.addEventListener('close', () => modal.remove());
}

/// ====================== PERFORM IMPORT ======================
function performImport(newOnes, similarOnes, modal) {
    let added = 0;
    let overwritten = 0;

    const importCheckboxes = modal.querySelectorAll('.import-checkbox');
    const overwriteCheckboxes = modal.querySelectorAll('.overwrite-checkbox');

    // Neue Ressourcen
    newOnes.forEach((item, i) => {
        if (importCheckboxes[i]?.checked) {
            const res = item.resource || item;
            store.resources.push({
                ...res,
                favorite: false,
                lastModified: new Date().toLocaleDateString('de-DE')
            });
            added++;
        }
    });

    // Ähnliche Ressourcen
    similarOnes.forEach((item, i) => {
        const importCb = importCheckboxes[newOnes.length + i];
        if (!importCb?.checked) return;

        const overwriteCb = overwriteCheckboxes[i];
        const res = item.resource || item;

        if (overwriteCb?.checked && item.existing) {
            const idx = store.resources.findIndex(r => r === item.existing);
            if (idx !== -1) {
                store.resources[idx] = {
                    ...res,
                    favorite: store.resources[idx].favorite ?? false,
                    lastModified: new Date().toLocaleDateString('de-DE')
                };
                overwritten++;
            }
        } else {
            store.resources.push({
                ...res,
                favorite: false,
                lastModified: new Date().toLocaleDateString('de-DE')
            });
            added++;
        }
    });

    createSafetyBackup(`Import: ${added} neu + ${overwritten} überschrieben`);

    store.save();
    applyFilters();
    updateTopStats();
    updateSubjectStats();
    updateStorageIndicator();

    showFancyAlert(
        '✅ Import erfolgreich',
        'success',
        `${added} neue Ressourcen hinzugefügt<br>${overwritten} Ressourcen überschrieben`
    );
}

// ====================== HILFSFUNKTIONEN ======================

function getDifferenceHint(existing, imported) {
    const diffs = [];
    if (existing.topic !== imported.topic) diffs.push("anderer Titel");
    if ((existing.description || '') !== (imported.description || '')) diffs.push("andere Beschreibung");
    if (existing.level !== imported.level) diffs.push("anderes Level");
    if (existing.competence !== imported.competence) diffs.push("andere Kompetenz");
    return diffs.length ? diffs.join(" • ") : "ähnliche Metadaten";
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function similarity(a, b) {
    if (!a || !b) return 0;
    const len = Math.max(a.length, b.length);
    return (len - levenshteinDistance(a.toLowerCase().trim(), b.toLowerCase().trim())) / len;
}

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
    for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j-1] === b[i-1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i-1][j]+1, matrix[i][j-1]+1, matrix[i-1][j-1]+cost);
        }
    }
    return matrix[b.length][a.length];
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function migrateImportedResources(imported, sourceLevels, targetLevels) {
    if (sourceLevels === targetLevels || !Array.isArray(imported)) return imported;
    return imported.map(r => {
        if (!r?.level) return r;
        let num = parseInt(String(r.level).match(/\d+/)?.[0] || 0);
        if (!num) return r;
        if (sourceLevels === 5 && targetLevels === 3) num = num <= 2 ? 1 : (num === 3 ? 2 : 3);
        else if (sourceLevels === 3 && targetLevels === 5) num = num === 1 ? 1 : (num === 2 ? 3 : 5);
        r.level = `Niveaustufe ${num}`;
        return r;
    });
}