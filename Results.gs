/**
 * Bygger om resultatsidan från grunden varje gång den anropas. Elever identifieras
 * via verifierad e-post. Flervalsfrågor rättas via Google Forms quiz-poäng, kortsvar
 * rättas genom att jämföra elevens svar mot lärarens eget facit-svar (se Facit.gs) -
 * facit hämtas automatiskt varje gång den här funktionen körs.
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

  collectPendingFacits(register);

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

  const registerRows = register.getRange(2, 1, lastRow - 1, REGISTER_NUM_COLUMNS).getValues();
  const forms = registerRows.map(function (r) {
    return {
      id: r[REGISTER_COLUMNS.ID - 1],
      name: r[REGISTER_COLUMNS.NAME - 1],
      teacherEmail: String(r[REGISTER_COLUMNS.TEACHER_EMAIL - 1] || '').trim().toLowerCase(),
      facitEntries: JSON.parse(r[REGISTER_COLUMNS.FACIT_JSON - 1] || '[]')
    };
  }).filter(function (f) { return f.id; });

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
    const mcMax = isQuiz ? computeMaxScore(form) : 0;
    const gradedFacit = f.facitEntries.filter(function (e) { return e.correctAnswer !== null && e.points > 0; });
    const saMax = gradedFacit.reduce(function (sum, e) { return sum + e.points; }, 0);
    const totalMax = mcMax + saMax;
    const isGraded = totalMax > 0;

    const items = form.getItems();
    const stats = [];
    if (isQuiz) Array.prototype.push.apply(stats, computeMultipleChoiceStats(form, items, f.teacherEmail));
    if (gradedFacit.length) Array.prototype.push.apply(stats, computeShortAnswerStats(form, items, gradedFacit, f.teacherEmail));
    if (stats.length) questionStatsByForm.push({ formName: f.name, stats: stats });

    form.getResponses().forEach(function (response) {
      const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
      if (!email || email === f.teacherEmail) return; // Hoppa över lärarens eget facit-svar.

      if (!studentScores[email]) studentScores[email] = {};

      if (!isGraded) {
        studentScores[email][f.name] = { label: '✓' };
        return;
      }

      const mcScore = isQuiz ? response.getTotalScore() : 0;
      const saScore = scoreShortAnswers(response, items, gradedFacit);
      studentScores[email][f.name] = { score: mcScore + saScore, max: totalMax };
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
 * vilka frågor som är extra svåra för klassen.
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

function computeMultipleChoiceStats(form, items, teacherEmail) {
  const responses = studentResponses(form, teacherEmail);
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

/**
 * Andel elever vars kortsvar matchar lärarens facit-svar exakt (skiftlägesokänsligt).
 */
function computeShortAnswerStats(form, items, gradedFacit, teacherEmail) {
  const responses = studentResponses(form, teacherEmail);
  const stats = [];

  gradedFacit.forEach(function (entry) {
    const item = findTextItemByTitle(items, entry.title);
    if (!item) return;

    let correct = 0, answered = 0;
    responses.forEach(function (response) {
      const ir = response.getResponseForItem(item);
      if (!ir) return;
      answered++;
      if (isMatchingAnswer(ir, entry)) correct++;
    });
    if (answered === 0) return;

    stats.push({ title: entry.title, percentage: Math.round((correct / answered) * 100), answered: answered });
  });

  return stats;
}

/**
 * Alla svar på formuläret utom lärarens eget facit-svar.
 */
function studentResponses(form, teacherEmail) {
  return form.getResponses().filter(function (response) {
    const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
    return email && email !== teacherEmail;
  });
}

function scoreShortAnswers(response, items, gradedFacit) {
  let score = 0;
  gradedFacit.forEach(function (entry) {
    const item = findTextItemByTitle(items, entry.title);
    if (!item) return;
    const ir = response.getResponseForItem(item);
    if (ir && isMatchingAnswer(ir, entry)) score += entry.points;
  });
  return score;
}

function findTextItemByTitle(items, title) {
  return items.filter(function (item) {
    return item.getType() === FormApp.ItemType.TEXT && item.getTitle() === title;
  })[0];
}

function isMatchingAnswer(itemResponse, facitEntry) {
  const answer = String(itemResponse.getResponse()).trim().toLowerCase();
  const correct = String(facitEntry.correctAnswer || '').trim().toLowerCase();
  return answer !== '' && answer === correct;
}
