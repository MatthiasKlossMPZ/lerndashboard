// src/ui/newResource.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js';
import { populateFilterOptions } from './filters.js';
import { showUndoToast } from './modals.js';

export function openNewResourceWindow() {
    window.openNewResource();
}

export function initNewResourceListener() {
    window.addEventListener('message', event => {
        if (event.origin !== location.origin) return;
        const msg = event.data;
        if (!msg || msg.type !== 'SAVE_NEW') return;

        const resource = {
            ...msg.data,
            favorite: false,
            lastModified: new Date().toLocaleDateString('de-DE')
        };

        const backupBefore = JSON.parse(JSON.stringify(store.resources));

        if (Array.isArray(msg.replaceIndexes) && msg.replaceIndexes.length) {
            msg.replaceIndexes
                .slice()
                .sort((a, b) => b - a)
                .forEach(index => {
                    if (store.resources[index]) store.resources.splice(index, 1);
                });
        }

        store.resources.push(resource);
        store.save();
        populateFilterOptions();
        applyFilters();

        const undoEntry = {
            action: 'add',
            timestamp: Date.now(),
            resourcesBackup: backupBefore,
            message: `"${resource.topic}" hinzugefügt`,
            addedIndex: store.resources.length - 1
        };

        if (!store.undoStack) store.undoStack = [];
        store.undoStack.unshift(undoEntry);
        if (store.undoStack.length > 15) store.undoStack.pop();

        showUndoToast(undoEntry.message);
    });
}