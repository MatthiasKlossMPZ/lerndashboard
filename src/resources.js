// src/resources.js
console.log('🚀 resources.js START');

import { store } from './state.js';
import { getFilteredResources, getSortedResources } from './ui/filters.js';
import { updateSubjectStats, updateStorageIndicator, updateTopStats } from './stats.js';
import { showDeleteConfirm, deleteResourceConfirmed, cancelDelete } from './ui/modals.js';
import { escapeHtml } from './utils/helpers.js';

console.log('✅ resources.js erfolgreich geladen');

// ====================== INITIALISIERUNG ======================
export async function initializeData() {
    store.levelMode = localStorage.getItem('levelMode') || '5';
    store.compactMode = localStorage.getItem('compactMode') !== 'false';

    console.log('📊 Ressourcen geladen:', store.resources.length);
    return true;
}

// ====================== UI START ======================
export function startUI() {
    console.log('🎛️ startUI() gestartet');
}

export function displayResources(list) {
    const container = document.getElementById('resourcesList');
    if (!container) return;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `<p style="text-align:center;padding:40px;color:#888;">Keine passenden Ressourcen gefunden.</p>`;
        return;
    }

    list.forEach(resource => {
        const realIndex = store.resources.findIndex(r => r === resource);
        
        const lastModifiedText = resource.lastModified 
            ? `Zuletzt: ${resource.lastModified}` 
            : '';

        const div = document.createElement('div');
        div.className = `resource-item ${store.compactMode ? 'compact' : 'expanded'}`;
        div.dataset.index = realIndex;

        div.innerHTML = `
            <div class="resource-header">
                <strong>${escapeHtml(resource.topic || '(Kein Thema)')}</strong>
                
                <div class="tags">
                    ${resource.subject ? `<span class="tag subject-tag" onclick="event.stopImmediatePropagation(); applyQuickFilter('subject', '${escapeHtml(resource.subject)}')">${escapeHtml(resource.subject)}</span>` : ''}
                    ${resource.grade ? `<span class="tag grade-tag" onclick="event.stopImmediatePropagation(); applyQuickFilter('grade', '${escapeHtml(resource.grade)}')">${escapeHtml(resource.grade)}</span>` : ''}
                    ${resource.competence ? `<span class="tag competence-tag" onclick="event.stopImmediatePropagation(); applyQuickFilter('competence', '${escapeHtml(resource.competence)}')">${escapeHtml(resource.competence)}</span>` : ''}
                    ${resource.level ? `<span class="tag level-tag" onclick="event.stopImmediatePropagation(); applyQuickFilter('level', '${escapeHtml(resource.level)}')">${escapeHtml(resource.level)}</span>` : ''}
                    ${resource.tool ? `<span class="tag tool-tag" onclick="event.stopImmediatePropagation(); applyQuickFilter('tool', '${escapeHtml(resource.tool)}')">${escapeHtml(resource.tool)}</span>` : ''}
                </div>
            </div>

            <div class="resource-body">
                ${resource.description ? `
                    <div class="description">
                        ${escapeHtml(resource.description)}
                    </div>` : ''}
                
                <div class="last-modified">${lastModifiedText}</div>
            </div>

            <!-- Action Bar unten rechts -->
            <div class="action-bar">
                <span class="toggle-icon" onclick="event.stopImmediatePropagation(); toggleResource(${realIndex})">▼</span>
                
                <div class="action-icons">
                    <div class="action-icon favorite-icon ${resource.favorite ? 'active' : ''}" 
                         onclick="event.stopImmediatePropagation(); toggleFavorite(${realIndex})">
                        <svg><use xlink:href="#star-icon"/></svg>
                    </div>
                    <div class="action-icon edit-icon" 
                         onclick="event.stopImmediatePropagation(); editResource(${realIndex})">
                        <svg><use xlink:href="#edit-icon"/></svg>
                    </div>
                    <div class="action-icon delete-icon" 
                         onclick="event.stopImmediatePropagation(); deleteResource(${realIndex})">
                        <svg><use xlink:href="#delete-icon"/></svg>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(div);
    });
}

// ====================== DISPLAY ======================
export function applyFilters() {
    let filtered = getFilteredResources();   
    filtered = getSortedResources(filtered);
    
    displayResources(filtered);
    updateTopStats();
    updateSubjectStats();
    updateStorageIndicator();
}

// ====================== ACTION FUNCTIONS ======================

function toggleFavorite(i) {
    if (i < 0 || i >= store.resources.length) return;
    store.resources[i].favorite = !store.resources[i].favorite;
    store.save();
    applyFilters();
}

function deleteResource(i) {
    showDeleteConfirm(i);
}

// Deine editResource-Funktion
function editResource(index) {
    if (index < 0 || index >= store.resources.length) {
        console.error('Ungültiger Edit-Index:', index);
        return;
    }
    const resource = store.resources[index];
    const allTopics = [...new Set(store.resources.map(r => r.topic).filter(Boolean))];
    const allTools = [...new Set(store.resources.map(r => r.tool).filter(Boolean))];

    const popup = window.open(
        'edit-resource.html?index=' + index,
        'editResource',
        'width=760,height=860,scrollbars=yes,resizable=yes,menubar=no'
    );

    if (!popup) {
        console.error('Popup konnte nicht geöffnet werden');
        showFancyAlert('Popup blockiert', 'warning', 'Bitte erlaube Popups für diese Seite.');
        return;
    }

    console.log(`📝 Edit-Fenster geöffnet für Index ${index}`);

    let attempts = 0;
    const maxAttempts = 12;
    const sendData = () => {
        attempts++;
        if (popup.closed) return;
        try {
            popup.postMessage({
                type: 'EDIT_RESOURCE',
                index: index,
                data: resource,
                allTopics: allTopics,
                allTools: allTools
            }, location.origin);
        } catch (e) {
            console.warn('PostMessage fehlgeschlagen', e);
        }
        if (attempts < maxAttempts) setTimeout(sendData, 100);
    };
    setTimeout(sendData, 250);
}

// ====================== COMPACT MODE ======================
export function toggleCompactMode() {
    store.compactMode = !store.compactMode;
    localStorage.setItem('compactMode', store.compactMode);
    applyFilters();
}

// ====================== DETAIL-ANSICHT TOGGLE (DREIECK) ======================
export function toggleResource(index) {
    const items = document.querySelectorAll('.resource-item');
    const item = Array.from(items).find(el => parseInt(el.dataset.index) === index);
    
    if (!item) return;

    const isCurrentlyCompact = item.classList.contains('compact');

    if (isCurrentlyCompact) {
        // → Erweiterte Ansicht (Pfeil nach oben)
        item.classList.remove('compact');
        item.classList.add('expanded');
    } else {
        // → Kompakt-Ansicht (Pfeil nach unten)
        item.classList.add('compact');
        item.classList.remove('expanded');
    }

    // Icon korrekt drehen
    const icon = item.querySelector('.toggle-icon');
    if (icon) {
        icon.style.transform = isCurrentlyCompact ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    // Zustand speichern
    store.compactMode = item.classList.contains('compact');
    localStorage.setItem('compactMode', store.compactMode);
}

window.toggleResource = toggleResource;

// ====================== GLOBALE BINDINGS ======================
window.toggleFavorite = toggleFavorite;
window.deleteResource = deleteResource;
window.editResource = editResource;
window.toggleCompactMode = toggleCompactMode;

console.log('✅ resources.js vollständig initialisiert');

export { getSortedResources };