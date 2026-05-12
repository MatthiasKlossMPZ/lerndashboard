// src/ui/editResource.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js';
import { updateSubjectStats } from '../stats.js';
import { showUndoToast } from './modals.js';

console.log('✅ editResource.js geladen');

export function initEditResourceListener() {
    window.addEventListener('message', event => {
        if (event.origin !== location.origin) return;
        const msg = event.data;

        if (msg.type === 'SAVE_EDIT' && msg.index >= 0) {
            const index = msg.index;
            const oldResource = { ...store.resources[index] }; // Backup für Undo

            // Update durchführen
            store.resources[index] = {
                ...store.resources[index],
                ...msg.data,
                lastModified: new Date().toLocaleDateString('de-DE')
            };

            const newResource = store.resources[index];

            store.save();
            applyFilters();
            updateSubjectStats();

            // Undo-Eintrag erstellen
            const undoEntry = {
                action: 'edit',
                timestamp: Date.now(),
                index: index,
                oldResource: oldResource,
                newResource: { ...newResource },
                message: `"${newResource.topic}" bearbeitet`
            };

            if (!store.undoStack) store.undoStack = [];
            store.undoStack.unshift(undoEntry);
            if (store.undoStack.length > 15) store.undoStack.pop();

            // Rückgängig-Toast anzeigen
            showUndoToast(undoEntry.message);

            console.log(`✏️ Ressource bearbeitet: ${newResource.topic}`);
        }
    });
}