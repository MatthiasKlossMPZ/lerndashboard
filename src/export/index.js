// export/index.js
// ====================== VOLLSTÄNDIGES EXPORT-MODUL ======================

import { getFilteredResources } from '../ui/filters.js';
import { getLevelMode, getLevelOptions } from '../levelMode.js';
import { showFancyAlert } from '../ui/modals.js';
import { createSafetyBackup } from '../stats.js';
import { store } from '../state.js';

// ==================== HILFSFUNKTIONEN ====================
function getDateString() {
    return new Date().toISOString().slice(0, 10);
}

function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function updateCurrentFilters() {
    return {
        subject: document.getElementById('filterSubject')?.value?.trim() || '',
        grade: document.getElementById('filterGrade')?.value?.trim() || '',
        competence: document.getElementById('filterCompetence')?.value?.trim() || '',
        level: document.getElementById('filterLevel')?.value?.trim() || '',
        tool: document.getElementById('filterTool')?.value?.trim().toLowerCase() || ''
    };
}

// ====================== BASIS EXPORTS ======================
 
export function exportTemplate() {
    const template = [
        'Thema,Unterrichtsfach,Klassenstufe,Kompetenzbereich,Niveaustufe,Digitales Hilfsmittel,Beschreibung',
        'Beispiel: Klimawandel,Geografie,Klasse 7,Analysieren und Reflektieren,Niveaustufe 3,Google Earth,"Beschreibung des Einsatzes..."'
    ].join('\n');
    downloadFile(template, 'Lerndashboard_Vorlage.csv', 'text/csv');
    showFancyAlert('Vorlage heruntergeladen', 'success');
}
export function exportCSV() {
    const filtered = getFilteredResources();
    if (filtered.length === 0) {
        showFancyAlert('Keine gefilterten Daten!', 'warning');
        return;
    }

    // === Schulname & Metadaten (wie bei Matrix-Excel) ===
    const schoolName = store.schoolName || localStorage.getItem('schoolName') || 'Deine Schule';
    const filters = updateCurrentFilters();
    let filterParts = [];
    if (filters.subject) filterParts.push(filters.subject);
    if (filters.grade) filterParts.push(filters.grade);
    if (filters.level) filterParts.push(filters.level);
    if (filters.competence) filterParts.push(filters.competence);
    if (filters.tool) filterParts.push(`Tool: ${filters.tool}`);

    const documentTitle = filterParts.length > 0 
        ? filterParts.join(' | ') 
        : 'Lernressourcen';

    const exportDate = `Export: ${new Date().toLocaleDateString('de-DE')}`;

    // Header mit Schulname
    let csv = `"${schoolName}";"${documentTitle}";"${exportDate}"\n\n`;

    // Spalten-Header
    const columns = ['Thema','Unterrichtsfach','Klassenstufe','Kompetenzbereich','Niveaustufe','Digitales_Hilfsmittel','Beschreibung'];
    csv += columns.join(',') + '\n';

    // Daten
    const rows = filtered.map(r => [
        `"${(r.topic || '').replace(/"/g, '""')}"`,
        `"${r.subject || ''}"`,
        `"${r.grade || ''}"`,
        `"${r.competence || ''}"`,
        `"${r.level || ''}"`,
        `"${(r.tool || '').replace(/"/g, '""')}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`
    ].join(','));

    csv += rows.join('\n');

    downloadFile(csv, `LernDashboard_${getDateString()}.csv`, 'text/csv');
    showFancyAlert('CSV Export mit Schulname erfolgreich!', 'success');
}

// ====================== MATRIX EXPORTS ======================

export function exportMatrixCSV() {
    const filtered = getFilteredResources();
    if (filtered.length === 0) {
        return showFancyAlert('Keine Daten!', 'warning');
    }

    const schoolName = store.schoolName || localStorage.getItem('schoolName') || 'Deine Schule';

    const filters = updateCurrentFilters();
    let filterParts = [];
    if (filters.subject) filterParts.push(filters.subject);
    if (filters.grade) filterParts.push(filters.grade);
    if (filters.level) filterParts.push(filters.level);
    if (filters.competence) filterParts.push(filters.competence);
    if (filters.tool) filterParts.push(`Tool: ${filters.tool}`);

    const documentTitle = filterParts.length > 0 
        ? filterParts.join(' | ') 
        : 'Kompetenzmatrix';

    const exportDate = `Export: ${new Date().toLocaleDateString('de-DE')}`;

    const competences = [
        "Suchen, Verarbeiten und Aufbewahren",
        "Kommunizieren und Kooperieren",
        "Produzieren und Präsentieren",
        "Schützen und sicher Agieren",
        "Problemlösen und Handeln",
        "Analysieren und Reflektieren"
    ];

    const levels = getLevelOptions();

    const matrix = {};
    competences.forEach(c => {
        matrix[c] = {};
        levels.forEach(l => matrix[c][l] = new Set());
    });

    filtered.forEach(r => {
        const comp = r.competence?.trim();
        const level = r.level?.trim();
        if (matrix[comp]?.[level]) {
            const entry = `${r.topic} (${[r.subject, r.grade, r.tool].filter(Boolean).join(', ')})`;
            const desc = r.description ? `: ${r.description}` : '';
            matrix[comp][level].add(entry + desc);
        }
    });

    let csv = `"${schoolName}";"${documentTitle}";"${exportDate}"\n\n`; 
    csv += '"Kompetenz";' + levels.map(l => `"${l}"`).join(';') + '\n';  

    competences.forEach(comp => {
        const row = [`"${comp}"`];
        levels.forEach(level => {
            const entries = [...matrix[comp][level]];
            row.push(`"${entries.length ? entries.join('\n') : '—'}"`);
        });
        csv += row.join(';') + '\n';
    });

    downloadFile(csv, `Matrix_${getDateString()}.csv`, 'text/csv');
    showFancyAlert('Matrix CSV exportiert! (mit Schulname)', 'success');
}

export function exportPDF() {
    const filtered = getFilteredResources();
    if (filtered.length === 0) {
        showFancyAlert('Keine gefilterten Daten!', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 35;

    // === Schulname & Metadaten ===
    const schoolName = store.schoolName || localStorage.getItem('schoolName') || 'Deine Schule';
    const filters = updateCurrentFilters();
    let filterParts = [];
    if (filters.subject) filterParts.push(filters.subject);
    if (filters.grade) filterParts.push(filters.grade);
    if (filters.level) filterParts.push(filters.level);
    if (filters.competence) filterParts.push(filters.competence);
    if (filters.tool) filterParts.push(`Tool: ${filters.tool}`);

    const documentTitle = filterParts.length > 0 
        ? filterParts.join(' | ') 
        : 'Lernressourcen';

    const today = new Date().toLocaleDateString('de-DE');

    // Header
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(schoolName, pageWidth - 15, 15, { align: 'right' });

    doc.setFontSize(20);
    doc.setTextColor(107, 70, 193);
    doc.text('LernDashboard Digital', pageWidth / 2, y - 5, { align: 'center' });

    doc.setFontSize(12);
    doc.text(documentTitle, pageWidth / 2, y + 8, { align: 'center' });
    doc.text(`Exportiert am: ${today}`, pageWidth / 2, y + 16, { align: 'center' });

    y += 25;

    // Ressourcen auflisten
    filtered.forEach((r, i) => {
        if (y > 260) {
            doc.addPage();
            y = 30;
        }

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${i + 1}. ${r.topic || '—'}`, 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.text(`Fach: ${r.subject || '—'} | Klasse: ${r.grade || '—'} | ${r.level || '—'}`, 20, y);
        y += 8;

        if (r.tool) {
            doc.text(`Tool: ${r.tool}`, 20, y);
            y += 8;
        }

        if (r.description) {
            const descLines = doc.splitTextToSize(r.description, 170);
            doc.text(descLines, 20, y);
            y += descLines.length * 5 + 8;
        } else {
            y += 8;
        }
    });

    doc.save(`LernDashboard_${getDateString()}.pdf`);
    showFancyAlert('PDF Export mit Schulname erfolgreich!', 'success');
}

export function exportMatrixPDF() {
    const filtered = getFilteredResources();
    if (filtered.length === 0) {
        showFancyAlert('Keine gefilterten Daten!', 'warning', 'Keine passenden Ressourcen gefunden.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        // ==================== TITEL-HEADER ====================
        const schoolName = localStorage.getItem('schoolName') || 'Deine Schule';
        const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const subject = document.getElementById('filterSubject')?.value || '';
        const grade   = document.getElementById('filterGrade')?.value || '';
        const level   = document.getElementById('filterLevel')?.value || '';
        const competence = document.getElementById('filterCompetence')?.value || '';
        const tool    = document.getElementById('filterTool')?.value || '';

        let filterParts = [subject, grade, level, competence].filter(Boolean);
        if (tool) filterParts.push(`Tool: ${tool}`);
        const documentTitle = filterParts.length ? filterParts.join(' | ') : 'Kompetenzmatrix';

        // Titel oben
        let y = 15;
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(schoolName, 12, y);

        doc.setFontSize(18);
        doc.setTextColor(107, 70, 193);
        doc.setFont('helvetica', 'bold');
        doc.text(documentTitle, doc.internal.pageSize.getWidth() / 2, y + 8, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Exportiert am: ${today}`, doc.internal.pageSize.getWidth() - 12, y, { align: 'right' });

        y += 22;

        // ==================== MATRIX TABELLE ====================
        const competences = [
            "Suchen, Verarbeiten und Aufbewahren",
            "Kommunizieren und Kooperieren",
            "Produzieren und Präsentieren",
            "Schützen und sicher Agieren",
            "Problemlösen und Handeln",
            "Analysieren und Reflektieren"
        ];

        const levels = getLevelOptions();

        const matrix = {};
        competences.forEach(c => { matrix[c] = {}; levels.forEach(l => matrix[c][l] = []); });
        filtered.forEach(r => {
            const c = r.competence?.trim();
            const l = r.level?.trim();
            if (c && l && matrix[c]?.[l]) {
                matrix[c][l].push(`${r.topic}\nKlasse ${r.grade||''}${r.tool ? ` – ${r.tool}` : ''}`);
            }
        });

        const tableBody = competences.map(comp => {
            const row = [comp];
            levels.forEach(l => {
                const entries = matrix[comp][l];
                row.push(entries.length ? entries.join('\n\n') : '—');
            });
            return row;
        });

        const levelColors = [
            [76, 175, 80], [139, 195, 74], [255, 193, 7],
            [255, 152, 0], [244, 67, 54]
        ];

        doc.autoTable({
            startY: y,
            head: [['Kompetenz', ...levels]],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [107, 70, 193],
                textColor: 255,
                fontSize: 11,
                halign: 'center',
                valign: 'middle',
                cellPadding: 5
            },
            bodyStyles: {
                fontSize: 8.5,
                cellPadding: 4,
                valign: 'middle',
                lineColor: [220, 220, 220]
            },
            columnStyles: {
                0: { 
                    cellWidth: 68,
                    fillColor: [235, 220, 255]   // helles Lila für Kompetenzspalte
                }
            },
            alternateRowStyles: { fillColor: [248, 249, 255] },
            margin: { left: 12, right: 12, bottom: 15 },

            // Farbige Niveaustufen-Header + vertikale Zentrierung
            didDrawCell: function (data) {
                if (data.section === 'head' && data.column.index > 0) {
                    const colIndex = data.column.index - 1;
                    if (colIndex < levelColors.length) {
                        doc.setFillColor(...levelColors[colIndex]);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        doc.setTextColor(255);
                        doc.setFontSize(10.5);
                        doc.text(data.cell.text, data.cell.x + data.cell.width / 2, data.cell.y + 8.5, { align: 'center' });
                    }
                }
            }
        });

        // Seitennummern
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Seite ${i}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        }

        doc.save(`Matrix_${getDateString() || new Date().toISOString().slice(0,10)}.pdf`);
        showFancyAlert('Matrix PDF erfolgreich erstellt!', 'success');

    } catch (err) {
        console.error('PDF-Fehler:', err);
        showFancyAlert('Fehler beim PDF-Export', 'error');
    }
}

// ====================== MATRIX EXCEL ======================

export function exportMatrixExcel() {
    const filtered = getFilteredResources();
    if (filtered.length === 0) {
        showFancyAlert('Keine gefilterten Daten!', 'warning');
        return;
    }

    if (typeof ExcelJS === 'undefined') {
        showFancyAlert('ExcelJS Bibliothek nicht geladen!', 'error');
        return;
    }

    try {
        const competences = [
            "Suchen, Verarbeiten und Aufbewahren",
            "Kommunizieren und Kooperieren",
            "Produzieren und Präsentieren",
            "Schützen und sicher Agieren",
            "Problemlösen und Handeln",
            "Analysieren und Reflektieren"
        ];

        const levels = getLevelOptions();

        const baseLevelColors = {
            'Niveaustufe 1': 'FF4CAF50',
            'Niveaustufe 2': 'FF8BC34A',
            'Niveaustufe 3': 'FFFFC107',
            'Niveaustufe 4': 'FFFF9800',
            'Niveaustufe 5': 'FFF44336'
        };

        const levelColors = {};
        levels.forEach((lvl, idx) => {
            levelColors[lvl] = Object.values(baseLevelColors)[idx] || 'FF6B46C1';
        });

        const headerColor = 'FF6B46C1';
        const contentColor = 'FFF8F9FA';

        // Filter für Titel
        const filters = updateCurrentFilters();
        let filterParts = [];
        if (filters.subject) filterParts.push(filters.subject);
        if (filters.grade) filterParts.push(filters.grade);
        if (filters.level) filterParts.push(filters.level);
        if (filters.competence) filterParts.push(filters.competence);
        if (filters.tool) filterParts.push(`Tool: ${filters.tool}`);

        const documentTitle = filterParts.length > 0 
            ? filterParts.join(' | ') 
            : 'Kompetenzmatrix';

        const fileTitle = `Matrix_${getDateString()}`;
        const schoolName = localStorage.getItem('schoolName') || 'Deine Schule';
        const exportDate = `Export: ${new Date().toLocaleDateString('de-DE')}`;

        // Matrix aufbauen
        const matrix = {};
        competences.forEach(c => {
            matrix[c] = {};
            levels.forEach(l => matrix[c][l] = []);
        });

        filtered.forEach(r => {
            const comp = r.competence?.trim();
            const level = r.level?.trim();
            if (!comp || !level || !matrix[comp]?.[level]) return;

            const entry = `${r.topic} (${[r.subject, r.grade, r.tool].filter(Boolean).join(', ')})`;
            const desc = r.description ? `: ${r.description}` : '';
            matrix[comp][level].push(entry + desc);
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Kompetenzmatrix');

        const numLevels = levels.length;
        const totalColumns = numLevels + 1;

        // Header-Zeile
        const headerTopRow = sheet.addRow(Array(totalColumns).fill(''));
        headerTopRow.height = 55;

        const schoolCell = headerTopRow.getCell(1);
        schoolCell.value = schoolName;
        schoolCell.font = { bold: true, size: 12, color: { argb: headerColor } };
        schoolCell.alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells(1, 2, 1, totalColumns - 1);
        const titleCell = sheet.getCell(1, 2);
        titleCell.value = documentTitle;
        titleCell.font = { bold: true, size: 12, color: { argb: headerColor } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const dateCell = headerTopRow.getCell(totalColumns);
        dateCell.value = exportDate;
        dateCell.font = { size: 11, color: { argb: 'FF666666' } };
        dateCell.alignment = { horizontal: 'right', vertical: 'middle' };

        sheet.addRow([]);

        // Spalten-Header
        const headerRow = sheet.addRow(['Kompetenzbereich', ...levels]);
        headerRow.eachCell((cell, colNumber) => {
            let fillColor = colNumber === 1 ? headerColor : levelColors[levels[colNumber - 2]] || headerColor;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF999999' } },
                left: { style: 'thin', color: { argb: 'FF999999' } },
                bottom: { style: 'thin', color: { argb: 'FF999999' } },
                right: { style: 'thin', color: { argb: 'FF999999' } }
            };
        });
        headerRow.height = 45;

        // Daten-Zeilen
        competences.forEach(comp => {
            const rowValues = [comp, ...levels.map(l => matrix[comp][l].join('\n\n') || '–')];
            const row = sheet.addRow(rowValues);

            // Kompetenz-Zelle
            const compCell = row.getCell(1);
            compCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
            compCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            compCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            compCell.border = {
                top: { style: 'thin', color: { argb: 'FF999999' } },
                left: { style: 'thin', color: { argb: 'FF999999' } },
                bottom: { style: 'thin', color: { argb: 'FF999999' } },
                right: { style: 'thin', color: { argb: 'FF999999' } }
            };

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber > 1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: contentColor } };
                    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                    if (cell.value && cell.value !== '–') cell.value = '\n' + cell.value + '\n';
                    if (cell.value === '–') {
                        cell.font = { color: { argb: 'FF999999' }, italic: true };
                    }
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                    };
                }
            });

            // Zeilenhöhe dynamisch
            let maxLines = 1;
            row.eachCell({ includeEmpty: true }, (cell) => {
                if (cell.value) {
                    const lines = (cell.value.toString().match(/\n/g) || []).length + 1;
                    if (lines > maxLines) maxLines = lines;
                }
            });
            row.height = Math.max(70, maxLines * 22);
        });

        // Spaltenbreiten
        sheet.columns = [
            { width: 36 },
            ...levels.map(() => ({ width: 44 }))
        ];

        // Datei speichern
        workbook.xlsx.writeBuffer().then(buffer => {
            const excelBlob = new Blob([buffer], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(excelBlob);
            link.download = `${fileTitle}.xlsx`;
            link.click();

            showFancyAlert('Excel-Matrix erfolgreich erstellt!', 'success');
        }).catch(err => {
            console.error("Excel Export Fehler:", err);
            showFancyAlert('Export fehlgeschlagen!', 'error');
        });

    } catch (err) {
        console.error('Excel-Fehler:', err);
        showFancyAlert('Fehler beim Excel-Export', 'error');
    }
}

// ====================== BACKUP & DRUCK ======================

export function autoBackup() {
    createSafetyBackup('Manuelles Backup');

    const backupData = {
        version: "1.2",
        exportDate: new Date().toISOString(),
        levelMode: getLevelMode(),
        numLevels: parseInt(getLevelMode()),
        resources: store.resources          // ← hier store verwenden
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    downloadFile(jsonString, `LernDashboard_Backup_${getDateString()}.json`, 'application/json');

    showFancyAlert('Backup erfolgreich erstellt & heruntergeladen!', 'success');
}

export function printOptimized() {
    const schoolName = localStorage.getItem('schoolName') || 'Deine Schule';
    const allResources = store.resources;     // ← hier store verwenden

    if (allResources.length === 0) {
        showFancyAlert('Keine Ressourcen zum Drucken.', 'warning');
        return;
    }

    let printHtml = `
        <h1 style="text-align:center;color:#6b46c1;">LernDashboard Digital – Alle Ressourcen</h1>
        <p style="text-align:center;">Schule: <strong>${schoolName}</strong> | ${new Date().toLocaleDateString('de-DE')}</p>
    `;

    allResources.forEach((r, i) => {
        printHtml += `
            <div style="margin:15px 0; padding:10px; border-bottom:1px solid #ddd;">
                <h3>${i+1}. ${r.topic || '—'}</h3>
                <p><strong>Fach:</strong> ${r.subject || '—'} | 
                   <strong>Klasse:</strong> ${r.grade || '—'} | 
                   <strong>Niveau:</strong> ${r.level || '—'}</p>
                ${r.tool ? `<p><strong>Tool:</strong> ${r.tool}</p>` : ''}
                ${r.description ? `<p style="margin-top:8px;">${r.description}</p>` : ''}
            </div>`;
    });

    const mainContainer = document.querySelector('.main');
    const originalContent = mainContainer.innerHTML;

    mainContainer.innerHTML = printHtml;
    window.print();

    setTimeout(() => {
        mainContainer.innerHTML = originalContent;
    }, 800);
}

// ====================== IMPORT ======================

export function importFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        if (file.name.toLowerCase().endsWith('.json')) {
            handleJSONImport(content);
        } else if (file.name.toLowerCase().endsWith('.csv')) {
            handleCSVImport(content);
        } else {
            showFancyAlert('Falsches Format', 'warning', 'Nur .csv oder .json erlaubt.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Platzhalter für Import-Logik (kann später erweitert werden)
function handleJSONImport(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        const imported = data.resources || data;
        if (Array.isArray(imported)) {
            showFancyAlert('JSON Import wird vorbereitet...', 'success');
            // Hier kommt später die volle Import-Logik mit Duplikat-Prüfung
        }
    } catch (e) {
        showFancyAlert('Ungültige JSON-Datei', 'error');
    }
}

function handleCSVImport(csvString) {
    showFancyAlert('CSV Import wird vorbereitet...', 'success');
    // Hier kommt später die volle CSV-Import-Logik
}

console.log('✅ Export-Modul vollständig geladen');