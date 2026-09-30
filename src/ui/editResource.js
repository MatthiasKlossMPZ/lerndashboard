// src/ui/editResource.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js';
import { populateFilterOptions } from './filters.js';
import { updateSubjectStats } from '../stats.js';
import { showUndoToast } from './modals.js';

console.log('✅ editResource.js geladen');

export function initEditResourceListener() {
    if (window.__editListenerBound) return;
    window.__editListenerBound = true;

    window.addEventListener('message', event => {
        if (event.origin !== location.origin) return;
        const msg = event.data;

                if (msg.type === 'SAVE_EDIT' && msg.index >= 0 && store.resources[msg.index]) {
            const backupBefore = JSON.parse(JSON.stringify(store.resources));

            store.resources[msg.index] = {
                ...store.resources[msg.index],
                ...msg.data,
                lastModified: new Date().toISOString().slice(0, 16).replace('T', ' ')
            };

            if (!store.undoStack) store.undoStack = [];
            store.undoStack.unshift({
                action: 'edit',
                resourcesBackup: backupBefore,
                timestamp: Date.now()
            });
            if (store.undoStack.length > 15) store.undoStack.pop();

            store.save();
            populateFilterOptions();
            applyFilters();
            updateSubjectStats();

            showUndoToast(`„${store.resources[msg.index].topic}“ bearbeitet`);

            console.log('✏️ Ressource bearbeitet');
        }
    });
}