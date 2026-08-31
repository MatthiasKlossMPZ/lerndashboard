// src/ui/newResource.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js'; 
import { populateFilterOptions } from './filters.js';

export function openNewResourceWindow() {
    const popup = window.open('new-resource.html', 'newResource', 
        'width=740,height=820,resizable=yes,scrollbars=yes,menubar=no,location=no');

    if (!popup) {
        alert('Popup wurde blockiert – bitte Popups erlauben!');
        return;
    }

    const send = () => {
        try {
            popup.postMessage({ type: 'NEW_RESOURCE' }, location.origin);
        } catch (e) {}
    };

    send();
    popup.addEventListener('load', send, { once: true });
    setTimeout(send, 180);
}

export function initNewResourceListener() {
    window.addEventListener('message', event => {
        if (event.origin !== location.origin) return;
        const msg = event.data;

        if (msg.type === 'SAVE_NEW') {
            const resource = {
                ...msg.data,
                favorite: false,
                lastModified: new Date().toLocaleDateString('de-DE')
            };

            const backupBefore = JSON.parse(JSON.stringify(store.resources));

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

            applyFilters();

            if (typeof showUndoToast === 'function') {
                showUndoToast(undoEntry.message);
            } else {
                console.log('✅ Neue Ressource hinzugefügt – Undo bereit:', undoEntry.message);
            }
        }

        else if (msg.type === 'SAVE_EDIT' && msg.index >= 0) {
            store.resources[msg.index] = {
                ...store.resources[msg.index],
                ...msg.data,
                lastModified: new Date().toLocaleDateString('de-DE')
            };
            store.save();
            populateFilterOptions();
            applyFilters();
        }
    });
}