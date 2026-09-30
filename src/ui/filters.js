// src/ui/filters.js
import { store } from '../state.js';
import { applyFilters } from '../resources.js';
import { updateSubjectStats, updateStorageIndicator, updateTopStats } from '../stats.js';
import { getActiveProfile } from '../config/profiles.js';

console.log('✅ filters.js geladen');

// ====================== INITIALISIERUNG ======================
export function initFilters() {
    // Suchfeld
        const searchInput = document.getElementById('searchTopic');
    const suggestionsBox = document.getElementById('suggestions');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.trim();
            store.filters.topic = term;
            applyFilters();
            updateActiveFilterStyle();
            renderTopicSuggestions(term, searchInput, suggestionsBox);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideTopicSuggestions(suggestionsBox);
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsBox?.contains(e.target)) {
                hideTopicSuggestions(suggestionsBox);
            }
        });
    }

    // Alle Filter-Selects
    const filterMapping = {
        filterSubject: 'subject',
        filterGrade: 'grade',
        filterProgram: 'program',
        filterOccupation: 'occupation',
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

const sortSelect = document.getElementById('sortBy');
if (sortSelect) {
    sortSelect.addEventListener('change', () => {

        localStorage.setItem('sortMode', sortSelect.value);
        applyFilters();
    });
    
    const savedSort = localStorage.getItem('sortMode');
    if (savedSort) sortSelect.value = savedSort;
}

    console.log('🎛️ Filter-Listener initialisiert');
}

function hideTopicSuggestions(box) {
    if (!box) return;
    box.innerHTML = '';
    box.style.display = 'none';
}

function renderTopicSuggestions(term, input, box) {
    if (!box) return;

    const query = term.toLowerCase();
    if (!query) {
        hideTopicSuggestions(box);
        return;
    }

    const matches = [...new Set(
        store.resources
            .map(r => (r.topic || '').trim())
            .filter(Boolean)
    )]
        .filter(topic => topic.toLowerCase().includes(query))
        .sort((a, b) => a.localeCompare(b, 'de'))
        .slice(0, 10);

    if (!matches.length) {
        hideTopicSuggestions(box);
        return;
    }

    box.innerHTML = '';
    matches.forEach(topic => {
        const item = document.createElement('div');
        item.textContent = topic;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = topic;
            store.filters.topic = topic;
            applyFilters();
            updateActiveFilterStyle();
            hideTopicSuggestions(box);
        });
        box.appendChild(item);
    });
    box.style.display = 'block';
}

// ====================== FILTER LOGIK ======================
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
        if (f.program && resource.program !== f.program) return false;
        if (f.occupation && resource.occupation !== f.occupation) return false;
        if (f.competence && resource.competence !== f.competence) return false;
        if (f.tool && resource.tool !== f.tool) return false;
        if (f.grade && !flexMatch(resource.grade, f.grade)) return false;
        if (f.level && !flexMatch(resource.level, f.level)) return false;
        return true;
    });
}

function flexMatch(resourceValue, filterValue) {
    if (!resourceValue || !filterValue) return false;
    const r = String(resourceValue).trim();
    const f = String(filterValue).trim();
    if (r === f) return true;

    // Zahl-Matching (z.B. "Niveaustufe 2" und "2")
    const rNum = r.match(/\d+/);
    const fNum = f.match(/\d+/);
    if (rNum && fNum && rNum[0] === fNum[0]) return true;
    return false;
}

// ====================== UI HELFER ======================
function updateActiveFilterStyle() {
    const container = document.querySelector('.filter-container');
    if (!container) return;
    const isActive = Object.values(store.filters).some(v =>
        (typeof v === 'boolean' && v) || (typeof v === 'string' && v !== '')
    );
    container.classList.toggle('active', isActive);

    const title = document.getElementById('filterExportTitle');
    if (title) {
        title.textContent = isActive ? 'Filter-Exporte aktiv' : 'Filter-Exporte';
    }
}

export function resetFilters() {
    store.filters = {
        subject: '', grade: '', program: '', occupation: '',
        competence: '', level: '',
        tool: '', favorite: false, topic: ''
    };

    ['filterSubject', 'filterGrade', 'filterProgram', 'filterOccupation',
     'filterCompetence', 'filterLevel', 'filterTool', 'filterFavorite']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

    const searchInput = document.getElementById('searchTopic');
    if (searchInput) searchInput.value = '';
    hideTopicSuggestions(document.getElementById('suggestions'));

    applyFilters();
    updateActiveFilterStyle();
  
    console.log('🔄 Filter zurückgesetzt');
}

// ====================== POPULATE FILTER OPTIONS ======================
export function populateFilterOptions() {
    const r = store.resources;
    const profile = getActiveProfile();

    const subjects = [...new Set([
        ...(profile.subjects || []),
        ...r.map(x => x.subject).filter(Boolean)
    ])].sort();

    const competences = [...new Set(r.map(x => x.competence).filter(Boolean))].sort();
    const tools = [...new Set(r.map(x => x.tool).filter(Boolean))].sort();
    const gradeOptions = getAllGradeOptions(r);

    populateSelect('filterSubject', subjects);
    populateSelect('filterCompetence', competences);
    populateSelect('filterTool', tools);
    populateGradeSelect(gradeOptions);
    populateLevelSelect();

    const programs = [...new Set([
        ...(profile.programs || []),
        ...r.map(x => x.program).filter(Boolean)
    ])].sort();
    const occupations = [...new Set(r.map(x => x.occupation).filter(Boolean))].sort();
    populateSelect('filterProgram', programs);
    populateSelect('filterOccupation', occupations);

    requestAnimationFrame(() => restoreCurrentFilters());

    if (typeof applyProfileLabels === 'function') {
        applyProfileLabels();
    } else if (window.LDProfiles?.applyProfileLabels) {
        window.LDProfiles.applyProfileLabels();
    }

    const programGroup = document.getElementById('filterProgramGroup');
    const occupationGroup = document.getElementById('filterOccupationGroup');
    if (programGroup) programGroup.hidden = !profile.showProgram;
    if (occupationGroup) occupationGroup.hidden = !profile.showOccupation;
}

// ====================== GRADE & LEVEL HELFER ======================
function getAllGradeOptions(resources) {
    const existing = [...new Set(resources.map(x => x.grade).filter(Boolean))];
    const profileGrades = getActiveProfile().grades;
    return [...new Set([...profileGrades, ...existing])];
}

function restoreCurrentFilters() {
    ['subject', 'grade', 'program', 'occupation', 'competence', 'level', 'tool'].forEach(key => {
        if (store.filters[key]) {
            const map = {
                subject: 'filterSubject',
                grade: 'filterGrade',
                program: 'filterProgram',
                occupation: 'filterOccupation',
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

// ====================== LEVEL SELECT ======================
function populateLevelSelect() {
    const select = document.getElementById('filterLevel');
    if (!select) return;

    const current = select.value;
    const allLevels = getLevelOptions();

    select.innerHTML = '<option value="">Alle</option>';
    allLevels.forEach(level => {
        const o = document.createElement('option'); 
        o.value = level;
        o.textContent = level;
        select.appendChild(o);
    });

    if (current && allLevels.includes(current)) {
        select.value = current;
    } else {
        select.value = '';
    }

    console.log(`📊 Level-Filter aktualisiert für ${allLevels.length} Stufen`);
}

function getLevelOptions() {
    const count = parseInt(store.levelMode || 5);
    return Array.from({ length: count }, (_, i) => `Niveaustufe ${i + 1}`);
}

// ====================== QUICK FILTER PER TAG ======================
export function applyQuickFilter(key, value) {
    if (!key || value == null || value === '') return;

    const filterValue = String(value).trim();
    console.log(`🔎 Quick-Filter: ${key} = "${filterValue}"`);

    store.filters.subject = key === 'subject' ? filterValue : '';
    store.filters.grade = key === 'grade' ? filterValue : '';
    store.filters.program = key === 'program' ? filterValue : '';
    store.filters.occupation = key === 'occupation' ? filterValue : '';
    store.filters.competence = key === 'competence' ? filterValue : '';
    store.filters.level = key === 'level' ? filterValue : '';
    store.filters.tool = key === 'tool' ? filterValue : '';

    const selectMap = {
        subject: 'filterSubject',
        grade: 'filterGrade',
        program: 'filterProgram',
        occupation: 'filterOccupation',
        competence: 'filterCompetence',
        level: 'filterLevel',
        tool: 'filterTool'
    };

    Object.keys(selectMap).forEach(k => {
        const sel = document.getElementById(selectMap[k]);
        if (sel) sel.value = '';
    });

    const selectId = selectMap[key];
    if (selectId) {
        const select = document.getElementById(selectId);
        if (select) {
            const optionFound = Array.from(select.options).find(opt =>
                opt.value === filterValue || opt.textContent.trim() === filterValue
            );
            if (optionFound) select.value = optionFound.value;
        }
    }

    applyFilters();
    updateActiveFilterStyle();
    setTimeout(() => window.scrollTo({ top: 180, behavior: 'smooth' }), 80);
}

// ====================== SORTIERUNG ======================
export function getSortedResources(filteredList) {
    const sortMode = document.getElementById('sortBy')?.value || 'default';
    const list = [...filteredList]; // Kopie, um Original nicht zu verändern

    switch (sortMode) {
        case 'topic-asc':
            return list.sort((a, b) => (a.topic || '').localeCompare(b.topic || ''));
        case 'topic-desc':
            return list.sort((a, b) => (b.topic || '').localeCompare(a.topic || ''));
        case 'modified-desc':
    return list.sort((a, b) => {
        const dateA = a.lastModified || a.created || '1970-01-01';
        const dateB = b.lastModified || b.created || '1970-01-01';
        return new Date(dateB) - new Date(dateA);
            });
        case 'subject-asc':
            return list.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
        case 'favorite-first':
            return list.sort((a, b) => {
                if (a.favorite && !b.favorite) return -1;
                if (!a.favorite && b.favorite) return 1;
                return (a.topic || '').localeCompare(b.topic || '');
            });
        case 'level-asc':
            return list.sort((a, b) => {
                const levelA = parseInt((a.level || '').match(/\d+/)?.[0] || 0);
                const levelB = parseInt((b.level || '').match(/\d+/)?.[0] || 0);
                return levelA - levelB;
            });
        case 'default':
        default:
            return list; // Beibehält aktuelle Array-Reihenfolge
    }
}
// ====================== EXPORTS ======================
window.applyQuickFilter = applyQuickFilter;