// src/main.js
import { escapeHtml } from './utils/helpers.js';
import { store } from './state.js';
import { initializeData, startUI, applyFilters } from './resources.js';
import { updateVersionDisplay } from './ui/version.js';
import { initFilters, populateFilterOptions, applyQuickFilter } from './ui/filters.js';
import { 
    updateSubjectStats, 
    updateStorageIndicator, 
    initLevelMode,
    changeLevelMode,
    showInitialLevelModeModal
} from './stats.js';
import { 
    deleteResourceConfirmed, 
    cancelDelete,
    showUndoToast,
    undoLastAction ,
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

export function initUI() {
    console.log('🚀 initUI() gestartet');

    // ====================== ERSTER START - LEVEL-MODUS ======================
    if (!localStorage.getItem('levelMode')) {
        console.log('🆕 Frische Neuinstallation erkannt – Stufenabfrage wird angezeigt');
        showInitialLevelModeModal();
    } else {
        initLevelMode(); 
    }

    // ====================== NORMALER UI-START ======================
    // Sichere Aufrufe mit Fallback
    if (typeof updateTopStats === 'function') updateTopStats();
    if (typeof updateSubjectStats === 'function') updateSubjectStats();
    if (typeof updateStorageIndicator === 'function') updateStorageIndicator();

    initFilters();

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
    initFilters();
    window.applyQuickFilter = applyQuickFilter;
    populateFilterOptions();
    applyFilters();
    updateTopStats(); 
    updateSubjectStats();
    updateStorageIndicator();
    initLevelMode();
    updateVersionDisplay();

    // Level-Buttons
    document.getElementById('levelBtn3')?.addEventListener('click', () => changeLevelMode('3'));
    document.getElementById('levelBtn5')?.addEventListener('click', () => changeLevelMode('5'));

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

    const resource = store.resources[index];
    const allTopics = [...new Set(store.resources.map(r => r.topic))];
    const allTools = [...new Set(store.resources.map(r => r.tool).filter(Boolean))];

    const popup = window.open(
        'edit-resource.html?index=' + index,
        'editResource',
        'width=720,height=820,scrollbars=yes,resizable=yes'
    );

    setTimeout(() => {
        if (popup) {
            popup.postMessage({
                type: 'EDIT_RESOURCE',
                index: index,
                data: resource,
                allTopics: allTopics,
                allTools: allTools
            }, location.origin);
        }
    }, 300);

    console.log(`📝 Edit-Fenster geöffnet für Index ${index}`);
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
    schoolButton.removeAttribute('onclick'); // falls noch vorhanden
    schoolButton.addEventListener('click', () => window.setSchoolName());
    console.log('✅ Schulname-Button Listener gesetzt');
}
}

window.openNewResource = function() {
    const allTopics = [...new Set(store.resources.map(r => r.topic))];
    const allTools = [...new Set(store.resources.map(r => r.tool).filter(Boolean))];

    const popup = window.open(
        'new-resource.html',
        'newResource',
        'width=720,height=820,scrollbars=yes,resizable=yes'
    );

    setTimeout(() => {
        if (popup) {
            popup.postMessage({
                type: 'NEW_RESOURCE',
                allTopics: allTopics,
                allTools: allTools
            }, location.origin);
        }
    }, 300);

};

// ====================== SERVICE WORKER + UPDATE TOAST ======================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Zuerst alle alten SWs sauber entfernen (hilft gegen redundant)
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
                            console.log('🚀 Neue Version installiert → aktiviere');
                            if (typeof showUpdateToast === 'function') showUpdateToast();
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }

                        if (newWorker.state === 'activated') {
                        console.log('🎉 Neue Version aktiv! Seite wird neu geladen...');
                        setTimeout(() => {
                        window.location.reload();
                        }, 800);
                        }

                        if (newWorker.state === 'activated') {
                            console.log('🎉 Neue Version aktiv!');
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

// WICHTIG: Global verfügbar machen
window.initDarkMode = initDarkMode;
window.toggleDarkMode = toggleDarkMode;

initDarkMode();

console.log('🌗 Dark Mode Funktionen global registriert'); 

// ====================== GLOBALE FUNKTIONEN ======================

function openManual() {
    console.log('📖 Bedienungsanleitung wird geöffnet...');
    
    const pdfUrl = 'docs/Bedienungsanleitung_LernDashboard.pdf';
    
    const modal = document.createElement('dialog');
    modal.style.cssText = `
        width: 94%; 
        max-width: 1100px; 
        height: 92vh; 
        border: none; 
        border-radius: 16px; 
        padding: 0; 
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    modal.innerHTML = `
        <div style="position:relative; height:100%; display:flex; flex-direction:column;">
            <div style="padding:12px 20px; background:#f8f9fa; border-bottom:1px solid #ddd; 
                        display:flex; justify-content:space-between; align-items:center;">
                <strong>📖 Bedienungsanleitung LernDashboard</strong>
                <button onclick="this.closest('dialog').close()" 
                        style="background:#e74c3c; color:white; border:none; padding:8px 18px; 
                               border-radius:8px; cursor:pointer; font-weight:600;">
                    ✕ Schließen
                </button>
            </div>
            <iframe src="${pdfUrl}?v=${Date.now()}" 
                    style="flex:1; border:none; width:100%;" 
                    title="Bedienungsanleitung"></iframe>
        </div>
    `;

    document.body.appendChild(modal);
    modal.showModal();
}

function setSchoolName() {
    const current = store.schoolName || '';
    
    const schoolBtnEl = document.getElementById('schoolButton');
    const schoolTextEl = document.getElementById('schoolButtonText');

    // Alten Modal ggf. entfernen
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

    // === Event Listener (sauber und zuverlässig) ===
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

    // Enter-Taste im Input = Speichern
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });

    // Fokus setzen
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

// ====================== GLOBALE REGISTRIERUNG ======================

window.setSchoolName = setSchoolName;
window.openManual = openManual;


console.log('🌍 Globale Funktionen final registriert → setSchoolName, openManual');