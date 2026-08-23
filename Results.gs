/**
 * Bygger om resultatsidan från grunden varje gång den anropas, genom att läsa alla
 * formulär i registret och räkna om aktuella poäng. Elever identifieras via
 * verifierad e-post. Endast flervalsfrågor med rätt svar räknas in i poängen -
 * kortsvar är öppna frågor utan facit och visas inte här (svaren finns i
 * respektive "Svar - [formulärnamn]"-flik).
 *
 * Färgkodning (samma tröskelvärden för både elevresultat och frågeanalys):
 *   < 50 %  röd    (svårt / behöver stöd)
 *   50-74 % gul    (delvis)
 *   ≥ 75 %  grön   (bra resultat)
 */

const RESULT_COLORS = {
  RED: '#f4cccc',
  YELLOW: '#fff2cc',
  GREEN: '#d9ead3'
};

function colorForPercentage(pct) {
  if (pct < 50) return RESULT_COLORS.RED;
  if (pct < 75) return RESULT_COLORS.YELLOW;
  return RESULT_COLORS.GREEN;
}

function updateResultsSheet() {
  const ss = SpreadsheetApp.getActive();
  const register = ss.getSheetByName(SHEET_NAMES.REGISTER);
  const resultsSheet = ss.getSheetByName(SHEET_NAMES.RESULTS);

  resultsSheet.clear();
  resultsSheet.getRange('A1')
    .setValue('Sammanställning uppdaterad: ' + new Date().toLocaleString('sv-SE') +
      '  (färg: röd <50%, gul 50-74%, grön ≥75%)')
    .setFontStyle('italic');

  const lastRow = register.getLastRow();
  if (lastRow < 2) {
    resultsSheet.getRange('A3').setValue(
      'Inga formulär har skapats ännu. Använd menyn "Skapa Formulär > Nytt formulär (guide)".'
    );
    return;
  }

  const forms = register.getRange(2, 1, lastRow - 1, 2).getValues()
    .map(function (r) { return { id: r[0], name: r[1] }; })
    .filter(function (f) { return f.id; });

  const studentScores = {}; // e-post -> { formulärnamn: {score,max} eller {label:'✓'} }
  const formHeaders = [];
  const questionStatsByForm = []; // { formName, stats: [{title, percentage, answered}] }

  forms.forEach(function (f) {
    let form;
    try {
      form = FormApp.openById(f.id);
    } catch (e) {
      return; // Formuläret har troligen tagits bort manuellt i Drive.
    }

    formHeaders.push(f.name);
    const isQuiz = form.isQuiz();
    const maxScore = isQuiz ? computeMaxScore(form) : 0;
    const items = form.getItems();

    if (isQuiz) {
      const stats = computeMultipleChoiceStats(form, items);
      if (stats.length) questionStatsByForm.push({ formName: f.name, stats: stats });
    }

    form.getResponses().forEach(function (response) {
      const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
      if (!email) return;

      if (!studentScores[email]) studentScores[email] = {};
      studentScores[email][f.name] = isQuiz
        ? { score: response.getTotalScore(), max: maxScore }
        : { label: '✓' };
    });
  });

  const studentEmails = Object.keys(studentScores).sort(function (a, b) { return a.localeCompare(b, 'sv'); });
  const header = ['Elev (e-post)'].concat(formHeaders).concat(['Antal formulär besvarade']);
  const rows = [];
  const backgrounds = [];

  studentEmails.forEach(function (email) {
    const row = [email];
    const bgRow = [null];
    let answered = 0;

    formHeaders.forEach(function (fn) {
      const entry = studentScores[email][fn];
      if (entry === undefined) {
        row.push('–');
        bgRow.push(null);
        return;
      }
      answered++;
      if (entry.label) {
        row.push(entry.label);
        bgRow.push(null);
      } else {
        row.push(entry.score + '/' + entry.max);
        const pct = entry.max > 0 ? (entry.score / entry.max) * 100 : 0;
        bgRow.push(colorForPercentage(pct));
      }
    });

    row.push(answered);
    bgRow.push(null);
    rows.push(row);
    backgrounds.push(bgRow);
  });

  const startRow = 3;
  resultsSheet.getRange(startRow, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#d9ead3');

  let nextRow = startRow + 1;
  if (rows.length) {
    resultsSheet.getRange(nextRow, 1, rows.length, header.length).setValues(rows);
    resultsSheet.getRange(nextRow, 1, rows.length, header.length).setBackgrounds(backgrounds);
    nextRow += rows.length;
  } else {
    resultsSheet.getRange(nextRow, 1).setValue('Inga svar har kommit in ännu.');
    nextRow += 1;
  }
  resultsSheet.setFrozenRows(startRow);
  resultsSheet.autoResizeColumns(1, header.length);

  writeQuestionAnalysis(resultsSheet, nextRow + 2, questionStatsByForm);
}

/**
 * Skriver en tabell per formulär med andel rätt per fråga, så läraren snabbt ser
 * vilka frågor som är extra svåra för klassen. Endast flervalsfrågor med rätt
 * svar tas med - kortsvar saknar facit och kan inte räknas som rätt/fel.
 */
function writeQuestionAnalysis(sheet, startRow, questionStatsByForm) {
  if (!questionStatsByForm.length) return;

  sheet.getRange(startRow, 1)
    .setValue('Frågeanalys – andel rätt per fråga (visar vilka frågor som är svårast)')
    .setFontWeight('bold');
  let row = startRow + 1;

  questionStatsByForm.forEach(function (formEntry) {
    sheet.getRange(row, 1).setValue(formEntry.formName).setFontWeight('bold').setBackground('#efefef');
    row++;

    const header = ['Fråga', 'Andel rätt', 'Antal svar'];
    sheet.getRange(row, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    row++;

    const values = formEntry.stats.map(function (s) { return [s.title, s.percentage + '%', s.answered]; });
    const cellBackgrounds = formEntry.stats.map(function (s) { return [null, colorForPercentage(s.percentage), null]; });

    sheet.getRange(row, 1, values.length, header.length).setValues(values);
    sheet.getRange(row, 1, values.length, header.length).setBackgrounds(cellBackgrounds);
    row += values.length + 1; // Tom rad mellan formulären.
  });

  sheet.autoResizeColumns(1, 3);
}

function computeMaxScore(form) {
  let max = 0;
  form.getItems().forEach(function (item) {
    try {
      const type = item.getType();
      if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
        max += item.asMultipleChoiceItem().getPoints();
      } else if (type === FormApp.ItemType.CHECKBOX) {
        max += item.asCheckboxItem().getPoints();
      }
    } catch (e) {
      // Icke-poängsatta objekttyper ignoreras.
    }
  });
  return max;
}

function computeMultipleChoiceStats(form, items) {
  const responses = form.getResponses();
  const stats = [];

  items.forEach(function (item) {
    if (item.getType() !== FormApp.ItemType.MULTIPLE_CHOICE) return;
    let maxPoints = 0;
    try { maxPoints = item.asMultipleChoiceItem().getPoints(); } catch (e) {}
    if (maxPoints <= 0) return;

    let totalScore = 0, answered = 0;
    responses.forEach(function (response) {
      const ir = response.getResponseForItem(item);
      if (!ir) return;
      const score = ir.getScore();
      if (score === null || score === undefined) return;
      totalScore += score;
      answered++;
    });
    if (answered === 0) return;

    stats.push({ title: item.getTitle(), percentage: Math.round((totalScore / (maxPoints * answered)) * 100), answered: answered });
  });

  return stats;
}
