// src/ui/modals.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js';
import { updateSubjectStats, updateStorageIndicator } from '../stats.js';

console.log('✅ modals.js geladen');

let resourceToDeleteIndex = -1;

// ====================== DELETE CONFIRM DIALOG ======================
export function showDeleteConfirm(index) {
    resourceToDeleteIndex = index;
    const dialog = document.getElementById('confirmDeleteDialog');
    if (dialog) dialog.showModal();
}

export function cancelDelete() {
    const dialog = document.getElementById('confirmDeleteDialog');
    if (dialog) dialog.close();
    resourceToDeleteIndex = -1;
}

// ====================== LÖSCHEN + UNDO TOAST ======================
export function deleteResourceConfirmed() {
    if (resourceToDeleteIndex < 0 || resourceToDeleteIndex >= store.resources.length) return;

    const resource = store.resources[resourceToDeleteIndex];

    // Backup für Undo-Stack
    const backupBefore = JSON.parse(JSON.stringify(store.resources));

    // Ressource löschen
    store.resources.splice(resourceToDeleteIndex, 1);
    store.save();
    applyFilters();
    updateSubjectStats();
    updateStorageIndicator();

    const dialog = document.getElementById('confirmDeleteDialog');
    if (dialog) dialog.close();

    // Roten Undo-Toast anzeigen
    showDeleteUndoToast(resource);

    resourceToDeleteIndex = -1;
}

// ====================== KLEINER GRÜNER TOAST (Neue Ressource) ======================
export function showUndoToast(message) {
    createUndoToast(message, '#27ae60', '✅');
}

// ====================== KLEINER ROTER TOAST (Löschen) ======================
export function showDeleteUndoToast(deletedResource) {
    const message = `"${deletedResource.topic || 'Ressource'}" gelöscht`;
    createUndoToast(message, '#e53935', '🗑️');
}

// ====================== GENERISCHE TOAST-FUNKTION ======================
function createUndoToast(message, color, emoji) {
    // Alten Toast entfernen
    let toast = document.getElementById('undoToast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'undoToast';
    toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 14px 22px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        font-weight: 600;
        font-size: 15.2px;
        z-index: 40000;
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 300px;
        max-width: 90vw;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    toast.innerHTML = `
        <span>${emoji}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="undoLastAction()" 
                style="background:rgba(255,255,255,0.25); 
                       border:none; color:white; padding:8px 16px; 
                       border-radius:8px; cursor:pointer; font-weight:700; font-size:14px;">
            ↩️ Rückgängig
        </button>
    `;

    document.body.appendChild(toast);

    // Auto-Hide
    setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
    }, 6000);
}

// ====================== GENERISCHES UNDO (für Add + Delete) ======================
export function undoLastAction() {
    if (!store.undoStack || store.undoStack.length === 0) return;

    const entry = store.undoStack.shift();

    if (entry.action === 'add' && entry.addedIndex !== undefined) {
        // Neue Ressource entfernen
        store.resources.splice(entry.addedIndex, 1);
        console.log('🔄 Neue Ressource rückgängig gemacht');
    } 
    else if (entry.action === 'delete' && entry.resourcesBackup) {
        // Gelöschte Ressource wiederherstellen
        store.resources = JSON.parse(JSON.stringify(entry.resourcesBackup));
        console.log('🔄 Gelöschte Ressource wiederhergestellt');
    }

    store.save();
    applyFilters();
    updateSubjectStats();
    updateStorageIndicator();

    // Toast entfernen
    const toast = document.getElementById('undoToast');
    if (toast) toast.remove();

    console.log('✅ Undo ausgeführt');
}

// ====================== GENERISCHES FANCY ALERT (mit optionalen zwei Buttons) ======================
export function showFancyAlert(title, type = 'info', subtitle = '', onConfirm = null, onCancel = null) {
    document.querySelectorAll('[data-fancy-alert]').forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.dataset.fancyAlert = 'true';
    modal.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);
        display:flex;justify-content:center;align-items:center;
        z-index:30000;padding:20px;box-sizing:border-box;
    `;

    const colors = { success: '#27ae60', warning: '#f39c12', info: '#6b46c1', error: '#e74c3c' };
    const color = colors[type] || colors.info;

    let buttonsHTML = '';

    if (onCancel) {
        // Zwei-Button-Modus
        buttonsHTML = `
            <div style="display:flex; gap:12px; justify-content:center;">
                <button id="fancyAlertCancel" 
                        style="padding:11px 24px;background:#64748b;color:white;border:none;border-radius:12px;font-weight:600;font-size:16px;cursor:pointer;">
                    3 Stufen
                </button>
                <button id="fancyAlertOK" 
                        style="padding:11px 28px;background:${color};color:white;border:none;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer;">
                    5 Stufen
                </button>
            </div>
        `;
    } else {
        // Ein-Button-Modus (wie bisher)
        buttonsHTML = `
            <button id="fancyAlertOK" 
                    style="padding:11px 28px;background:${color};color:white;border:none;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer;" autofocus>
                OK
            </button>
        `;
    }

    modal.innerHTML = `
        <div style="background:var(--card);padding:32px;border-radius:16px;text-align:center;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
            <div style="margin:0 auto 20px;width:70px;height:70px;">
                <svg width="70" height="70" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#e0e0e0" stroke-width="4"/>
                    <circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="276.46" stroke-dashoffset="276.46" style="animation:drawCircle 1s ease forwards;"/>
                    <path d="M30 50 L45 65 L70 35" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:100;stroke-dashoffset:100;animation:draw 0.6s ease forwards 0.5s;"/>
                </svg>
            </div>
            <p style="font-size:19px;font-weight:700;color:${color};margin:0 0 8px;">${title}</p>
            ${subtitle ? `<p style="font-size:14px;color:var(--text-light);margin:0 0 24px;line-height:1.5;">${subtitle}</p>` : ''}
            ${buttonsHTML}
        </div>
    `;

    document.body.appendChild(modal);

    // Button-Logik
    const okBtn = modal.querySelector('#fancyAlertOK');
    const cancelBtn = modal.querySelector('#fancyAlertCancel');

    if (okBtn) {
        okBtn.onclick = () => closeModal(true);
    }
    if (cancelBtn) {
        cancelBtn.onclick = () => closeModal(false);
    }

    function closeModal(confirmed) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            if (confirmed && onConfirm) onConfirm();
            if (!confirmed && onCancel) onCancel();
        }, 350);
    }
}

// ====================== UPDATE TOAST (Neue Version) ======================
export function showUpdateToast() {
    // Alten Toast ggf. entfernen
    let existing = document.getElementById('updateToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'updateToast';
    toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        background: #27ae60;
        color: white;
        padding: 14px 20px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        font-weight: 600;
        font-size: 15.2px;
        z-index: 40000;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 92vw;
        white-space: nowrap;
        overflow: hidden;
    `;

    toast.innerHTML = `
        <span style="font-size:20px;">🚀</span>
        <span>App wurde aktualisiert</span>
        <button onclick="window.location.reload()" 
                style="margin-left: auto; 
                       background: rgba(255,255,255,0.25); 
                       border: none; 
                       color: white; 
                       padding: 8px 16px; 
                       border-radius: 8px;
                       font-weight: 700;
                       font-size: 14px;
                       cursor: pointer;
                       transition: all 0.2s;">
            Neu laden
        </button>
    `;

    document.body.appendChild(toast);

    // Automatisch ausblenden nach 8 Sekunden (falls Nutzer nicht klickt)
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.transition = 'opacity 0.4s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }
    }, 8000);
}

// ====================== WINDOW BINDINGS ======================
window.showDeleteConfirm = showDeleteConfirm;
window.undoLastAction = undoLastAction;

console.log('✅ modals.js mit einheitlichen Undo-Toasts geladen');