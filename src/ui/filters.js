// src/ui/filters.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js';
import { updateSubjectStats, updateStorageIndicator, updateTopStats } from '../stats.js';


console.log('✅ filters.js geladen');

// ====================== INITIALISIERUNG ======================
export function initFilters() {
    // Suchfeld
    const searchInput = document.getElementById('searchTopic');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            store.filters.topic = searchInput.value.trim();
            applyFilters();
            updateActiveFilterStyle();
        });
    }

    // Alle Filter-Selects
    const filterMapping = {
        filterSubject: 'subject',
        filterGrade: 'grade',
        filterCompetence: 'competence',
        filterLevel: 'level',
        filterTool: 'tool',
        filterFavorite: 'favorite'
    };

    Object.entries(filterMapping).forEach(([id, key]) => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                store.filters[key] = (key === 'favorite') 
                    ? (select.value === 'true') 
                    : select.value;
                applyFilters();
                updateActiveFilterStyle();
            });
        }
    });

    // Reset-Button
    const resetBtn = document.getElementById('resetFilters') || document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }

    console.log('🎛️ Filter-Listener initialisiert');
}

// ====================== FILTER LOGIK (verbessert) ======================
export function getFilteredResources() {
    return store.resources.filter(resource => {
        const f = store.filters;

        if (f.favorite && !resource.favorite) return false;

        if (f.topic) {
            const term = f.topic.toLowerCase();
            if (!resource.topic?.toLowerCase().includes(term) &&
                !resource.description?.toLowerCase().includes(term)) return false;
        }

        if (f.subject && resource.subject !== f.subject) return false;
        if (f.competence && resource.competence !== f.competence) return false;
        if (f.tool && resource.tool !== f.tool) return false;

        if (f.grade) {
            if (!flexMatch(resource.grade, f.grade)) return false;
        }
        if (f.level) {
            if (!flexMatch(resource.level, f.level)) return false;
        }

        return true;
    });
}

function flexMatch(resourceValue, filterValue) {
    if (!resourceValue || !filterValue) return false;
    const r = String(resourceValue).trim();
    const f = String(filterValue).trim();

    if (r === f) return true;

    // Zahl-Extraktion
    const rNum = r.match(/\d+/);
    const fNum = f.match(/\d+/);
    if (rNum && fNum && rNum[0] === fNum[0]) return true;

    return false;
}

function normalizeNumber(value) {
    if (value == null || value === '') return '';
    const match = String(value).match(/\d+/);
    return match ? match[0] : String(value).trim();
}

// ====================== UI HELFER ======================
function updateActiveFilterStyle() {
    const container = document.querySelector('.filter-container');
    if (!container) return;

    const isActive = Object.values(store.filters).some(v => 
        (typeof v === 'boolean' && v) || 
        (typeof v === 'string' && v !== '')
    );

    container.classList.toggle('active', isActive);
}

export function resetFilters() {
    store.filters = {
        subject: '', grade: '', competence: '', level: '', 
        tool: '', favorite: false, topic: ''
    };

    // Alle Selects zurücksetzen
    ['filterSubject','filterGrade','filterCompetence','filterLevel','filterTool','filterFavorite']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

    const searchInput = document.getElementById('searchTopic');
    if (searchInput) searchInput.value = '';

    applyFilters();
    updateActiveFilterStyle();
    console.log('🔄 Filter zurückgesetzt');
}

// ====================== POPULATE FILTER OPTIONS ======================
export function populateFilterOptions() {
    const r = store.resources;

    const subjects = [...new Set(r.map(x => x.subject).filter(Boolean))].sort();
    const competences = [...new Set(r.map(x => x.competence).filter(Boolean))].sort();
    const tools = [...new Set(r.map(x => x.tool).filter(Boolean))].sort();

    const gradeOptions = getAllGradeOptions(r);

    populateSelect('filterSubject', subjects);
    populateSelect('filterCompetence', competences);
    populateSelect('filterTool', tools);
    populateGradeSelect(gradeOptions);     
    populateLevelSelect();                 

    requestAnimationFrame(() => restoreCurrentFilters());
}

// ====================== GRADE & LEVEL HELFER ======================
function getAllGradeOptions(resources) {
    const existing = [...new Set(resources.map(x => x.grade).filter(Boolean))];
    const allGrades = Array.from({length: 13}, (_, i) => `Klasse ${i + 1}`);
    
    // Alle Klassen 1-13 + eventuell weitere (z.B. Klasse 0 oder 14)
    return [...new Set([...allGrades, ...existing])].sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
    });
}

function restoreCurrentFilters() {
    ['subject', 'grade', 'competence', 'level', 'tool'].forEach(key => {
        if (store.filters[key]) {
            const map = {
                subject: 'filterSubject',
                grade: 'filterGrade',
                competence: 'filterCompetence',
                level: 'filterLevel',
                tool: 'filterTool'
            };
            const sel = document.getElementById(map[key]);
            if (sel) sel.value = store.filters[key];
        }
    });
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Alle</option>';
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
    });
    if (current && options.includes(current)) select.value = current;
}

function populateGradeSelect(options) {
    const select = document.getElementById('filterGrade');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">Alle</option>';

    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
    });

    if (current && options.includes(current)) select.value = current;
}

function populateLevelSelect() {
    const select = document.getElementById('filterLevel');
    if (!select) return;

    const current = select.value;
    const allLevels = getLevelOptions();   // aus stats.js oder hier

    select.innerHTML = '<option value="">Alle</option>';

    allLevels.forEach(level => {
        const o = document.createElement('option');
        o.value = level;
        o.textContent = level;
        select.appendChild(o);
    });

    if (current && allLevels.includes(current)) select.value = current;
}

function getLevelOptions() {
    const count = parseInt(store.levelMode || 5);
    return Array.from({ length: count }, (_, i) => `Niveaustufe ${i + 1}`);
}

// ====================== QUICK FILTER PER TAG (ROBUST) ======================
export function applyQuickFilter(key, value) {
    if (!key || value == null || value === '') return;

    const filterValue = String(value).trim();
    console.log(`🔎 Quick-Filter: ${key} = "${filterValue}"`);

    // === Andere Filter zurücksetzen (wie früher gewünscht) ===
    store.filters.subject = key === 'subject' ? filterValue : '';
    store.filters.grade = key === 'grade' ? filterValue : '';
    store.filters.competence = key === 'competence' ? filterValue : '';
    store.filters.level = key === 'level' ? filterValue : '';
    store.filters.tool = key === 'tool' ? filterValue : '';
    // topic-Suche und Favorite bleiben erhalten (kann man bei Bedarf auch zurücksetzen)

    // === DOM Selects aktualisieren ===
    const selectMap = {
        subject: 'filterSubject',
        grade: 'filterGrade',
        competence: 'filterCompetence',
        level: 'filterLevel',
        tool: 'filterTool'
    };

    // Alle Selects zuerst zurücksetzen
    Object.keys(selectMap).forEach(k => {
        const id = selectMap[k];
        const select = document.getElementById(id);
        if (select) select.value = '';
    });

    // Gewählten Filter setzen (mit smarter Matching-Logik)
    const selectId = selectMap[key];
    if (selectId) {
        const select = document.getElementById(selectId);
        if (select) {
            let optionFound = Array.from(select.options).find(opt =>
                opt.value === filterValue || opt.textContent.trim() === filterValue
            );

            // Für Grade/Level: Zahl-Matching („9. Klasse“ → „Klasse 9“)
            if (!optionFound && (key === 'grade' || key === 'level')) {
                const numMatch = filterValue.match(/\d+/);
                if (numMatch) {
                    const num = numMatch[0];
                    optionFound = Array.from(select.options).find(opt =>
                        opt.value.includes(num) || opt.textContent.includes(num)
                    );
                }
            }

            if (optionFound) {
                select.value = optionFound.value;
                console.log(`✅ Select "${selectId}" auf "${optionFound.value}" gesetzt`);
            } else {
                console.warn(`⚠️ Keine passende Option für ${key}="${filterValue}" gefunden`);
            }
        }
    }

    applyFilters();
    updateActiveFilterStyle();

    // Kleiner Scroll-Effekt (wie vorher)
    setTimeout(() => window.scrollTo({ top: 180, behavior: 'smooth' }), 80);
}

// ====================== EXPORTS ======================
window.applyQuickFilter = applyQuickFilter;