// src/state.js
export const store = {
    resources: [],
    undoStack: [],
    schoolName: '',
    
    // WICHTIG: Filter-Objekt
    filters: {
        subject: '',
        grade: '',
        competence: '',
        level: '',
        tool: '',
        favorite: false,
        topic: ''
    },

    levelMode: '5',
    compactMode: true,
    selectedIds: new Set(),

    save() {
        try {
            localStorage.setItem('resources', JSON.stringify(this.resources));
            localStorage.setItem('schoolName', this.schoolName || '');
            
        } catch (e) {
            console.error("Speicherfehler", e);
        }
    }
};

// Initial laden
const saved = localStorage.getItem('resources');
if (saved) store.resources = JSON.parse(saved);

console.log('✅ state.js geladen');

const savedUndo = localStorage.getItem('undoStack');
if (savedUndo) store.undoStack = JSON.parse(savedUndo);

console.log('✅ state.js geladen');

const savedSchool = localStorage.getItem('schoolName');
if (savedSchool) store.schoolName = savedSchool;