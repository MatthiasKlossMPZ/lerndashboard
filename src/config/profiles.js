/**
 * Schulform-Profile für das Lerndashboard
 */

export const PROFILE_KEY = 'schoolType';
export const DEFAULT_PROFILE_ID = 'allgemeinbildend';

const KMK_COMPETENCES = [
    'Suchen, Verarbeiten und Aufbewahren',
    'Kommunizieren und Kooperieren',
    'Produzieren und Präsentieren',
    'Schützen und sicher Agieren',
    'Problemlösen und Handeln',
    'Analysieren und Reflektieren'
];

export const PROFILES = {
    allgemeinbildend: {
        id: 'allgemeinbildend',
        name: 'Allgemeinbildende Schule',
        labels: {
            subject: 'Fach',
            subjectPlural: 'Fächer',
            grade: 'Klasse',
            program: 'Bildungsgang',
            occupation: 'Beruf'
        },
        subjects: [
            'AWT', 'Altgriechisch', 'Astronomie', 'Biologie', 'Chemie', 'Deutsch',
            'Englisch', 'Französisch', 'Geografie', 'Geschichte', 'Gesellschaftskunde',
            'Griechisch', 'Informatik', 'Italienisch', 'Kunst', 'Latein', 'Mathematik',
            'Musik', 'Niederdeutsch', 'Naturwissenschaften', 'Philosophieren mit Kindern',
            'Physik', 'Politische Bildung', 'Polnisch', 'Religion', 'Russisch',
            'Sachkunde', 'Schwedisch', 'Sozialkunde', 'Spanisch', 'Sport', 'Theater',
            'Werken', 'Wirtschaft'
        ],
        grades: Array.from({ length: 13 }, (_, i) => `Klasse ${i + 1}`),
        programs: [],
        showProgram: false,
        showOccupation: false,
        competences: KMK_COMPETENCES
    },

    beruflich: {
        id: 'beruflich',
        name: 'Berufliche Schule',
        labels: {
            subject: 'Fach / Lernfeld',
            subjectPlural: 'Fächer / Lernfelder',
            grade: 'Jahrgang',
            program: 'Schulart',
            occupation: 'Beruf / Fachrichtung'
        },
        subjects: [
            'Deutsch',
            'Englisch',
            'Mathematik',
            'Wirtschafts- und Sozialkunde',
            'Politik',
            'Religion / Ethik',
            'Sport',
            'Informatik',
            'Wirtschaft',
            'Lernfeld 1',
            'Lernfeld 2',
            'Lernfeld 3',
            'Lernfeld 4',
            'Lernfeld 5',
            'Lernfeld 6',
            'Lernfeld 7',
            'Lernfeld 8',
            'Lernfeld 9',
            'Lernfeld 10',
            'Lernfeld 11',
            'Lernfeld 12',
            'Lernfeld 13',
            'Biologie',
            'Fachpraxis',
            'Wahlpflichtbereich',
            'Sonstiges / berufsbezogen'
        ],
        grades: [
            '1. Ausbildungsjahr',
            '2. Ausbildungsjahr',
            '3. Ausbildungsjahr',
            '4. Ausbildungsjahr',
            'Jahrgangsstufe 11',
            'Jahrgangsstufe 12',
            'Jahrgangsstufe 13'
        ],
        programs: [
            'Duale Berufsausbildung (Berufsschule)',
            'Ausbildungsvorbereitung dual (AVdual)',
            'Berufsvorbereitung',
            'Berufsvorbereitung BVJA',
            'Berufsfachschule (BFS)',
            'Höhere Berufsfachschule (HBFS)',
            'Fachoberschule (FOS)',
            'Berufliches Gymnasium',
            'Fachschule'
        ],
        showProgram: true,
        showOccupation: true,
        competences: KMK_COMPETENCES
    }
};

export function getProfileId() {
    return localStorage.getItem(PROFILE_KEY) || DEFAULT_PROFILE_ID;
}

export function getActiveProfile() {
    return PROFILES[getProfileId()] || PROFILES[DEFAULT_PROFILE_ID];
}

export function setProfileId(id) {
    if (!PROFILES[id]) return getProfileId();
    localStorage.setItem(PROFILE_KEY, id);
    return id;
}

export function fillSelect(selectEl, options, placeholder) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    selectEl.appendChild(first);
    options.forEach(value => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        selectEl.appendChild(opt);
    });
    if (current && options.includes(current)) selectEl.value = current;
}

export function applyProfileLabels(root = document) {
    const p = getActiveProfile();
    root.querySelectorAll('[data-label="subject"]').forEach(el => { el.textContent = p.labels.subject; });
    root.querySelectorAll('[data-label="subjectPlural"]').forEach(el => { el.textContent = p.labels.subjectPlural; });
    root.querySelectorAll('[data-label="grade"]').forEach(el => { el.textContent = p.labels.grade; });
    root.querySelectorAll('[data-label="program"]').forEach(el => { el.textContent = p.labels.program; });
    root.querySelectorAll('[data-label="occupation"]').forEach(el => { el.textContent = p.labels.occupation; });
}

// Für die Popup-Seiten ohne ES-Import
window.LDProfiles = {
    PROFILES,
    PROFILE_KEY,
    getProfileId,
    getActiveProfile,
    setProfileId,
    fillSelect,
    applyProfileLabels
};
