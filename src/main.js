// src/main.js
import { store } from './state.js';
import { initializeData, startUI, applyFilters } from './resources.js';
import { updateVersionDisplay } from './ui/version.js';
import { initFilters, populateFilterOptions, applyQuickFilter } from './ui/filters.js';
import { 
    updateSubjectStats, 
    updateStorageIndicator, 
    initLevelMode,
    changeLevelMode 
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

    // ====================== LEVEL-MODUS INITIALISIERUNG ======================
    initLevelMode();   

    // ====================== NORMALER UI-START (dein Original-Code) ======================
    // Sichere Aufrufe mit Fallback
    if (typeof updateTopStats === 'function') updateTopStats();
    if (typeof updateSubjectStats === 'function') updateSubjectStats();
    if (typeof updateStorageIndicator === 'function') updateStorageIndicator();

    initFilters();
    initLevelMode();

    // Export / Import Module (wie bei dir)
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
};

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
        // WICHTIG: Relativer Pfad bei GitHub Pages Sub-Ordner
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker erfolgreich registriert');

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔍 Neue Version wird heruntergeladen...');

                    newWorker.addEventListener('statechange', () => {
                        console.log(`SW State: ${newWorker.state}`);

                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🚀 Neue Version installiert → aktiviere jetzt');
                            if (typeof showUpdateToast === 'function') {
                                showUpdateToast();
                            }
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }

                        if (newWorker.state === 'activated') {
                            console.log('🎉 Neue Version ist jetzt aktiv!');
                        }

                        if (newWorker.state === 'redundant') {
                            console.warn('⚠️ SW wurde redundant (Konflikt mit neuerer Version)');
                        }
                    });
                });
            })
            .catch(err => console.error('❌ SW-Registrierung fehlgeschlagen:', err));
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