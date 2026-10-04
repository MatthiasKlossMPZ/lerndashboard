/**
 * Lerndashboard
 *
 * Copyright (c) 2025-2026 Matthias Kloss
 *
 * This file is part of Lerndashboard and licensed under the MIT License.
 * See the LICENSE file in the project root for full license text.
 */

// src/main.js
import { escapeHtml } from './utils/helpers.js';
import { store } from './state.js';
import { getProfileId, setProfileId, applyProfileLabels, getActiveProfile } from './config/profiles.js';
import { initializeData, startUI, applyFilters } from './resources.js';
import { updateVersionDisplay } from './ui/version.js';
import { initFilters, populateFilterOptions, applyQuickFilter } from './ui/filters.js';
import {
    updateSubjectStats,
    updateStorageIndicator,
    initLevelMode,
    showInitialLevelModeModal
} from './stats.js';
import {
    deleteResourceConfirmed,
    cancelDelete,
    showUndoToast,
    undoLastAction,
    showFancyAlert,
    showUpdateToast
} from './ui/modals.js';
import { openNewResourceWindow, initNewResourceListener } from './ui/newResource.js';
import { handleImportFile } from './ui/import.js';
import { initEditResourceListener } from './ui/editResource.js';

import {
    exportTemplate,
    exportCSV,
    exportPDF,
    exportMatrixCSV,
    exportMatrixPDF,
    exportMatrixExcel,
    autoBackup,
    printOptimized
} from './export/index.js';

window.exportTemplate = exportTemplate;
window.exportCSV = exportCSV;
window.exportPDF = exportPDF;
window.exportMatrixCSV = exportMatrixCSV;
window.exportMatrixPDF = exportMatrixPDF;
window.exportMatrixExcel = exportMatrixExcel;
window.autoBackup = autoBackup;
window.printOptimized = printOptimized;
window.handleImportFile = handleImportFile;
window.escapeHtml = escapeHtml;

async function bootApp() {
    console.log('🚀 LernDashboard Modular startet...');

    try {
        await initializeData();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            initUI();
        }
    } catch (err) {
        console.error('❌ Boot-Fehler:', err);
    }
}

// ====================== IMPORT HELPER ======================
function setupImportHandler(handleImportFile) {
    const importInput = document.getElementById('importFile');
    if (!importInput) {
        console.warn('⚠️ #importFile Input nicht gefunden');
        return;
    }

    importInput.removeEventListener('change', handleImportFile);
    importInput.addEventListener('change', handleImportFile);
    console.log('✅ Import-Button erfolgreich verbunden');
}

function lockPageScroll() {
    document.documentElement.dataset.prevOverflow = document.documentElement.style.overflow || '';
    document.body.dataset.prevOverflow = document.body.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
}

function unlockPageScroll() {
    document.documentElement.style.overflow = document.documentElement.dataset.prevOverflow || '';
    document.body.style.overflow = document.body.dataset.prevOverflow || '';
    delete document.documentElement.dataset.prevOverflow;
    delete document.body.dataset.prevOverflow;
}

let resourceDialog = null;

function closeResourceFrame() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    const dialog = resourceDialog || document.getElementById('resourceFrameDialog');
    resourceDialog = null;
    if (!dialog) return;
    if (dialog.open) dialog.close();
    dialog.remove();
}

window.closeResourceFrame = closeResourceFrame;

function openResourceFrame(url, payload) {
    closeResourceFrame();

    const dialog = document.createElement('dialog');
    dialog.id = 'resourceFrameDialog';
    dialog.style.cssText = [
        'width:min(760px,96vw)',
        'height:min(860px,94vh)',
        'max-height:94vh',
        'padding:0',
        'border:none',
        'border-radius:16px',
        'overflow:hidden'
    ].join(';');
    dialog.innerHTML = '<iframe title="Ressource" style="display:block;width:100%;height:100%;border:0;"></iframe>';
    document.body.appendChild(dialog);
    resourceDialog = dialog;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const frame = dialog.querySelector('iframe');
    frame.src = url;
    frame.addEventListener('load', () => {
        frame.contentWindow.postMessage(payload, location.origin);
    }, { once: true });

    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeResourceFrame();
    });
    dialog.showModal();
}

window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type !== 'FORM_CLOSE') return;
    closeResourceFrame();
});

export function initUI() {
    console.log('🚀 initUI() gestartet');

    // ====================== ERSTER START - LEVEL-MODUS ======================
    if (!localStorage.getItem('levelMode')) {
        console.log('🆕 Frische Neuinstallation erkannt – Stufenabfrage wird angezeigt');
        showInitialLevelModeModal();
    } else {
        initLevelMode();
    }

    initSchoolTypeUI();
    applyProfileLabels();

    // ====================== NORMALER UI-START ======================
    if (typeof updateTopStats === 'function') updateTopStats();
    if (typeof updateSubjectStats === 'function') updateSubjectStats();
    if (typeof updateStorageIndicator === 'function') updateStorageIndicator();

    import('./export/index.js')
        .then(({
            exportTemplate, exportCSV, exportPDF,
            exportMatrixCSV, exportMatrixPDF, exportMatrixExcel,
            autoBackup, printOptimized
        }) => {
            window.exportTemplate = exportTemplate;
            window.exportCSV = exportCSV;
            window.exportPDF = exportPDF;
            window.exportMatrixCSV = exportMatrixCSV;
            window.exportMatrixPDF = exportMatrixPDF;
            window.exportMatrixExcel = exportMatrixExcel;
            window.autoBackup = autoBackup;
            window.printOptimized = printOptimized;
            console.log('✅ Export-Module erfolgreich geladen');
        })
        .catch(err => console.error('❌ Export-Module:', err));

    import('./ui/import.js')
        .then(({ handleImportFile }) => {
            setupImportHandler(handleImportFile);
            console.log('✅ Import-Modul geladen');
        })
        .catch(err => console.error('❌ Import-Modul:', err));

    import('./levelMode.js')
        .then(() => console.log('✅ levelMode.js geladen'))
        .catch(() => console.warn('levelMode.js noch nicht gefunden'));

    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        const saved = localStorage.getItem('sortMode');
        if (saved) sortSelect.value = saved;
    }

    // ====================== UI AUFBAU ======================
    startUI();
        const compactToggle = document.getElementById('compactToggle');
        if (compactToggle) compactToggle.checked = store.compactMode;
    initFilters();
    window.applyQuickFilter = applyQuickFilter;
    populateFilterOptions();
    applyFilters();
    updateTopStats();
    updateSubjectStats();
    updateStorageIndicator();
    initLevelMode();
    updateVersionDisplay();

    // Level-Buttons bleiben über onclick="changeLevelMode(...)" in index.html verdrahtet.

    // Delete Dialog
    const dialog = document.getElementById('confirmDeleteDialog');
    if (dialog) {
        dialog.querySelector('button[value="delete"]')?.addEventListener('click', deleteResourceConfirmed);
        dialog.querySelector('button[value="cancel"]')?.addEventListener('click', cancelDelete);
    }

    // Neue Ressource Button
    const newBtn = document.querySelector('.new-resource-btn');
    if (newBtn) newBtn.addEventListener('click', openNewResourceWindow);

    initNewResourceListener();
    initEditResourceListener();

    // Undo & FancyAlert
    window.showUndoToast = showUndoToast;
    window.undoLastAction = undoLastAction;
    window.showFancyAlert = showFancyAlert;
    window.applyFilters = applyFilters;
    window.toggleFavorite = toggleFavorite;
    window.showUpdateToast = showUpdateToast;

    // Restore Button
    document.querySelector('button[onclick*="showRestoreDialog"]')?.addEventListener('click', showRestoreDialog);

    // === EDIT & NEW RESOURCE WINDOW HANDLER ===
    window.editResource = function(index) {
        if (index < 0 || index >= store.resources.length) {
            console.error('Ungültiger Edit-Index:', index);
            return;
        }

        openResourceFrame('edit-resource.html?index=' + index, {
            type: 'EDIT_RESOURCE',
            index,
            data: JSON.parse(JSON.stringify(store.resources[index])),
            allTopics: [...new Set(store.resources.map(r => r.topic).filter(Boolean))],
            allTools: [...new Set(store.resources.map(r => r.tool).filter(Boolean))]
        });
    };

    // ====================== GLOBALE BUTTONS PER addEventListener ======================
    console.log('🔗 Globale Buttons werden verbunden...');

    // Handbuch-Button
    const manualBtn = document.getElementById('btnOpenManual') ||
        document.querySelector('button[onclick*="openManual"]');
    if (manualBtn) {
        manualBtn.addEventListener('click', openManual);
        manualBtn.removeAttribute('onclick');
    } else {
        console.warn('⚠️ Button für openManual nicht gefunden');
    }

    // ====================== Schulbutton beim Start aktualisieren ======================
    const schoolBtnEl = document.getElementById('schoolButton');
    const schoolTextEl = document.getElementById('schoolButtonText');

    if (schoolTextEl) {
        schoolTextEl.textContent = store.schoolName || 'Schule einstellen';
    }
    if (schoolBtnEl) {
        schoolBtnEl.dataset.set = store.schoolName ? 'true' : 'false';
    }

    // ====================== SCHOOL NAME BUTTON ======================
    const schoolButton = document.getElementById('schoolButton');
    if (schoolButton) {
        schoolButton.removeAttribute('onclick');
        schoolButton.addEventListener('click', () => window.setSchoolName());
        console.log('✅ Schulname-Button Listener gesetzt');
    }
}

window.openNewResource = function() {
    openResourceFrame('new-resource.html', {
        type: 'NEW_RESOURCE',
        allTopics: [...new Set(store.resources.map(r => r.topic).filter(Boolean))],
        allTools: [...new Set(store.resources.map(r => r.tool).filter(Boolean))]
    });
};

// ====================== SERVICE WORKER + UPDATE TOAST ======================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => {
                if (reg.active && reg.active.scriptURL !== new URL('./service-worker.js', location.href).href) {
                    console.log('🧹 Alten SW entfernt');
                    reg.unregister();
                }
            });
        });

        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registriert (Scope:', registration.scope, ')');

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔍 Neue Version wird heruntergeladen...');

                    newWorker.addEventListener('statechange', () => {
                        console.log(`SW State: ${newWorker.state}`);

                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Neue Version installiert');
                            if (typeof showUpdateToast === 'function') showUpdateToast();
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
}

                        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            console.log('Neue Version aktiv, Reload beim nächsten Aufruf');
}

                        if (newWorker.state === 'redundant') {
                            console.warn('⚠️ SW redundant – versuche Neuregistrierung');
                        }
                    });
                });
            })
            .catch(err => console.error('❌ SW-Fehler:', err));
    });
}
bootApp();

// ====================== DARK MODE ======================
function initDarkMode() {
    const saved = localStorage.getItem('darkMode') === 'true';
    if (saved) document.documentElement.classList.add('dark');
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    console.log('🌗 Dark Mode toggled →', isDark ? 'AN' : 'AUS');
}

window.initDarkMode = initDarkMode;
window.toggleDarkMode = toggleDarkMode;

initDarkMode();

console.log('🌗 Dark Mode Funktionen global registriert');

// ====================== GLOBALE FUNKTIONEN ======================

// ====================== HILFE / DOKUMENTE ======================
const HELP_DOCS = [
    {
        id: 'manual',
        title: 'Bedienung',
        fullTitle: 'Bedienungsanleitung LernDashboard',
        file: 'docs/Bedienungsanleitung_LernDashboard.pdf'
    },
    {
        id: 'levels-3',
        title: '3 Niveaustufen',
        fullTitle: 'KMK-Kompetenzrahmen · 3 Niveaustufen',
        file: 'docs/Niveaustufen_3.pdf',
        levelMode: '3'
    },
    {
        id: 'levels-5',
        title: '5 Niveaustufen',
        fullTitle: 'KMK-Kompetenzrahmen · 5 Niveaustufen',
        file: 'docs/Niveaustufen_5.pdf',
        levelMode: '5',
        hidden: true
    }
];

function getVisibleHelpDocs() {
    return HELP_DOCS.filter(doc => !doc.hidden);
}

function getPreferredHelpDocId() {
    const last = localStorage.getItem('helpDocId');
    const visible = getVisibleHelpDocs();
    if (last && visible.some(doc => doc.id === last)) return last;

    const mode = localStorage.getItem('levelMode') || store.levelMode || '5';
    const match = visible.find(doc => doc.levelMode === String(mode));
    return (match || visible[0]).id;
}

function openManual() {
    console.log('📖 Hilfe-Modal wird geöffnet...');

    document.querySelectorAll('dialog.help-modal').forEach(el => el.remove());

    const docs = getVisibleHelpDocs();
    if (!docs.length) return;

    let activeId = getPreferredHelpDocId();
    const modal = document.createElement('dialog');
    modal.className = 'help-modal';
    modal.style.cssText = `
        width: 96%;
        max-width: 1280px;
        height: 94vh;
        border: none;
        border-radius: 16px;
        padding: 0;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    const tabButtons = docs.map(doc => `
        <button type="button" class="help-tab" data-doc-id="${doc.id}"
                style="border:none; background:transparent; cursor:pointer;
                       font-weight:700; font-size:14px; padding:8px 14px;
                       border-radius:999px; color:#4a4458;">
            ${doc.title}
        </button>
    `).join('');

    modal.innerHTML = `
        <div style="position:relative; height:100%; display:flex; flex-direction:column;">
            <div style="padding:10px 16px; background:#f8f9fa; border-bottom:1px solid #ddd;
                        display:flex; gap:12px; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                <div style="display:flex; flex-direction:column; gap:8px; min-width:220px;">
                    <strong id="helpModalTitle">Hilfe</strong>
                    <div id="helpTabs" style="display:flex; gap:6px; flex-wrap:wrap;">${tabButtons}</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <a id="helpOpenTab" href="#" target="_blank" rel="noopener"
                       style="text-decoration:none; background:#6b46c1; color:white;
                              padding:8px 14px; border-radius:8px; font-weight:600; font-size:13px;">
                        Im neuen Tab öffnen
                    </a>
                    <button type="button" id="helpCloseBtn"
                            style="background:#e74c3c; color:white; border:none; padding:8px 18px;
                                   border-radius:8px; cursor:pointer; font-weight:600;">
                        ✕ Schließen
                    </button>
                </div>
            </div>
            <iframe id="helpPdfFrame"
                    style="flex:1; border:none; width:100%; background:#fff;"
                    title="Hilfedokument"></iframe>
        </div>
    `;

    document.body.appendChild(modal);

    const frame = modal.querySelector('#helpPdfFrame');
    const titleEl = modal.querySelector('#helpModalTitle');
    const openLink = modal.querySelector('#helpOpenTab');

    const showDoc = (id) => {
        const doc = docs.find(item => item.id === id) || docs[0];
        activeId = doc.id;
        localStorage.setItem('helpDocId', doc.id);
        titleEl.textContent = '📖 ' + doc.fullTitle;
        frame.src = doc.file;
        openLink.href = doc.file;
        modal.querySelectorAll('.help-tab').forEach(btn => {
            const active = btn.dataset.docId === doc.id;
            btn.style.background = active ? '#6b46c1' : 'transparent';
            btn.style.color = active ? '#fff' : '#4a4458';
        });
    };

    modal.querySelector('#helpTabs').addEventListener('click', (event) => {
        const btn = event.target.closest('.help-tab');
        if (!btn) return;
        showDoc(btn.dataset.docId);
    });

    modal.querySelector('#helpCloseBtn').addEventListener('click', () => modal.close());
    modal.addEventListener('close', () => modal.remove());

    showDoc(activeId);
    modal.showModal();
}

function setSchoolName() {
    const current = store.schoolName || '';
    const schoolBtnEl = document.getElementById('schoolButton');
    const schoolTextEl = document.getElementById('schoolButtonText');

    document.querySelectorAll('.school-modal').forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.className = 'school-modal';
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.65); backdrop-filter:blur(10px);
        display:flex; align-items:center; justify-content:center;
        z-index:30000;
    `;

    modal.innerHTML = `
        <div style="background:var(--card); padding:32px; border-radius:20px; width:90%; max-width:460px;
                    box-shadow:0 20px 60px rgba(0,0,0,0.4);">
            <h3 style="margin:0 0 8px; text-align:center; font-size:20px;">🏫 Schulname festlegen</h3>
            <p style="text-align:center; color:#666; margin-bottom:24px;">
                Wird in Druck-Exports und oben angezeigt
            </p>
            <input type="text" id="schoolNameInput" value="${escapeHtml(current)}"
                   placeholder="z. B. Grundschule am Park"
                   style="width:100%; padding:14px; font-size:16px; border:2px solid #ddd;
                          border-radius:12px; margin-bottom:24px; box-sizing:border-box;">
            <div style="display:flex; gap:12px; justify-content:flex-end;">
                <button id="cancelSchoolBtn"
                        style="padding:12px 26px; background:#95a5a6; color:white; border:none;
                               border-radius:12px; font-weight:600; cursor:pointer;">
                    Abbrechen
                </button>
                <button id="saveSchoolBtn"
                        style="padding:12px 32px; background:var(--primary); color:white; border:none;
                               border-radius:12px; font-weight:700; cursor:pointer;">
                    Speichern
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#schoolNameInput');
    const cancelBtn = modal.querySelector('#cancelSchoolBtn');
    const saveBtn = modal.querySelector('#saveSchoolBtn');

    const closeModal = () => modal.remove();

    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', () => {
        const name = input.value.trim();
        store.schoolName = name;
        localStorage.setItem('schoolName', name);
        store.save();

        if (schoolTextEl) schoolTextEl.textContent = name || 'Schule einstellen';
        if (schoolBtnEl) schoolBtnEl.dataset.set = name ? 'true' : 'false';

        closeModal();

        showFancyAlert(
            '✅ Erfolgreich',
            'success',
            name ? `Schulname auf „${name}“ gesetzt.` : 'Schulname entfernt.'
        );
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });

    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

function initSchoolTypeUI() {
    const select = document.getElementById('schoolTypeSelect');
    if (!select) return;

    const current = getProfileId();
    select.value = current;
    select.dataset.committed = current;
    updateProfileDependentUI();

    const onChange = () => {
        const next = select.value;
        const committed = select.dataset.committed || getProfileId();
        if (next === committed) return;
        showSchoolTypeModal(select, committed, next);
    };

    select.removeEventListener('change', select._schoolTypeHandler);
    select._schoolTypeHandler = onChange;
    select.addEventListener('change', onChange);
}

function showSchoolTypeModal(select, currentId, nextId) {
    document.querySelectorAll('.schooltype-modal').forEach(m => m.remove());

    const nextName = nextId === 'beruflich'
        ? 'Berufliche Schule'
        : 'Allgemeinbildende Schule';

    const modal = document.createElement('div');
    modal.className = 'schooltype-modal';
    modal.style.cssText = `
        position:fixed; inset:0; z-index:30000;
        background:rgba(0,0,0,0.65); backdrop-filter:blur(10px);
        display:flex; align-items:center; justify-content:center;
        padding:20px;
    `;

    modal.innerHTML = `
        <div style="background:var(--card); color:inherit; padding:32px; border-radius:20px;
                    width:90%; max-width:460px; box-shadow:0 20px 60px rgba(0,0,0,0.4);">
            <h3 style="margin:0 0 8px; text-align:center; font-size:20px;">Schulform wechseln?</h3>
            <p style="text-align:center; color:#666; margin:0 0 20px; line-height:1.5;">
                Wechsel zu <strong>${nextName}</strong>.
            </p>
            <ul style="margin:0 0 24px; padding-left:20px; line-height:1.6; color:#555;">
                <li>Vorhandene Ressourcen bleiben erhalten.</li>
                <li>Filter, Formulare und Bezeichnungen werden umgestellt.</li>
                <li>Alte Klassen- oder Fachwerte bleiben an den Karten stehen.</li>
            </ul>
            <div style="display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap;">
                <button type="button" id="schoolTypeCancel"
                        style="padding:12px 26px; background:#95a5a6; color:white; border:none;
                               border-radius:12px; font-weight:600; cursor:pointer;">
                    Abbrechen
                </button>
                <button type="button" id="schoolTypeOk"
                        style="padding:12px 32px; background:var(--primary); color:white; border:none;
                               border-radius:12px; font-weight:700; cursor:pointer;">
                    Wechseln
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const onEsc = (e) => {
        if (e.key === 'Escape') close(true);
    };

    const close = (reset) => {
        document.removeEventListener('keydown', onEsc);
        if (reset) {
            select.value = currentId;
            select.dataset.committed = currentId;
        }
        modal.remove();
    };

    document.addEventListener('keydown', onEsc);
    modal.querySelector('#schoolTypeCancel').addEventListener('click', () => close(true));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close(true);
    });

    modal.querySelector('#schoolTypeOk').addEventListener('click', () => {
        setProfileId(nextId);
        store.schoolType = nextId;
        select.dataset.committed = nextId;
        document.removeEventListener('keydown', onEsc);
        modal.remove();
        location.reload();
    });
}

function updateProfileDependentUI() {
    const profile = getActiveProfile();
    const programGroup = document.getElementById('filterProgramGroup');
    const occupationGroup = document.getElementById('filterOccupationGroup');
    if (programGroup) programGroup.hidden = !profile.showProgram;
    if (occupationGroup) occupationGroup.hidden = !profile.showOccupation;

    const sortOpt = document.querySelector('#sortBy option[data-label-option="subject"]');
    if (sortOpt) sortOpt.textContent = `${profile.labels.subject} A → Z`;

    const statsTitle = document.getElementById('statsFachTitle');
    if (statsTitle) statsTitle.textContent = `${profile.labels.subjectPlural}-Statistik`;
    const mark = document.getElementById('vocationalMark');
    if (mark) mark.hidden = getActiveProfile().id !== 'beruflich';
}

window.initSchoolTypeUI = initSchoolTypeUI;

// ====================== GLOBALE REGISTRIERUNG ======================

window.setSchoolName = setSchoolName;
window.openManual = openManual;
window.openNewResourceWindow = openNewResourceWindow;

console.log('🌍 Globale Funktionen final registriert → setSchoolName, openManual');
