/**
 * Bygger om resultatsidan från grunden varje gång den anropas, genom att läsa alla
 * formulär i registret och räkna om aktuella poäng. Elever identifieras via
 * verifierad e-post.
 *
 * Rättning av FLERVALSFRÅGOR: facit är INTE inskrivet i kalkylarket i förväg. Istället
 * svarar läraren på formuläret själv (samma Google-konto som skapade det) - det svaret
 * hittas automatiskt bland inkomna svar (matchas mot "Skapad av (e-post)" i registret)
 * och används som facit. Elevernas svar jämförs mot facit-svaret (exakt text, oberoende
 * av stor/liten bokstav och mellanslag). Svarar läraren om senare (för att rätta ett
 * misstag) används alltid det senaste svaret. Har läraren inte svarat på ett formulär
 * med flervalsfrågor än visas "Väntar på facit" istället för poäng för det formuläret.
 *
 * KORTSVAR rättas inte alls - de är öppna frågor utan facit och poäng. Ett formulär
 * som bara innehåller kortsvar (inga flervalsfrågor) visar istället "✓" för varje
 * elev som har svarat, så läraren snabbt ser vilka som svarat eller inte. Svaren i
 * sig går att läsa i respektive "Svar - [formulärnamn]"-flik.
 *
 * Se även Mailer.gs, som automatiskt mejlar varje elev sitt resultat på flervalsfrågorna
 * så fort facit finns - bygger på samma facit-hämtning och poängberäkning som här.
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

function normalizeAnswer(response) {
  const value = Array.isArray(response) ? response.join(', ') : response;
  return String(value || '').trim().toLowerCase();
}

function parsePointsMap(json) {
  const map = {};
  let list = [];
  try { list = JSON.parse(json || '[]'); } catch (e) { list = []; }
  list.forEach(function (entry) { map[entry.itemId] = entry.points; });
  return map;
}

function findFacitResponse(responses, creatorEmail) {
  if (!creatorEmail) return null;
  const matches = responses.filter(function (r) {
    return String(r.getRespondentEmail() || '').trim().toLowerCase() === creatorEmail;
  });
  if (!matches.length) return null;
  matches.sort(function (a, b) { return b.getTimestamp() - a.getTimestamp(); });
  return matches[0];
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

  const registerValues = register.getRange(2, 1, lastRow - 1, 12).getValues();
  const studentScores = {}; // e-post -> { formulärnamn: {score,max} eller {label:'...'} }
  const formHeaders = [];
  const questionStatsByForm = []; // { formName, stats: [{title, percentage, answered}] }

  registerValues.forEach(function (r, idx) {
    const id = r[0];
    const name = r[1];
    const creatorEmail = String(r[3] || '').trim().toLowerCase();
    if (!id) return;

    let form;
    try {
      form = FormApp.openById(id);
    } catch (e) {
      return; // Formuläret har troligen tagits bort manuellt i Drive.
    }

    formHeaders.push(name);
    const pointsMap = parsePointsMap(r[11]);
    const registerRowNum = idx + 2;
    const responses = form.getResponses();
    const hasGradedItems = Object.keys(pointsMap).length > 0;

    if (!hasGradedItems) {
      // Rena kortsvarsformulär (inga flervalsfrågor) rättas inte - visa bara vilka som svarat.
      register.getRange(registerRowNum, 10, 1, 2).setValues([['Ej tillämpligt', '']]);
      responses.forEach(function (response) {
        const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
        if (!email || email === creatorEmail) return;
        if (!studentScores[email]) studentScores[email] = {};
        studentScores[email][name] = { label: '✓' };
      });
      return;
    }

    const facitResponse = findFacitResponse(responses, creatorEmail);

    if (!facitResponse) {
      register.getRange(registerRowNum, 10, 1, 2).setValues([['Nej', '']]);
      responses.forEach(function (response) {
        const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
        if (!email || email === creatorEmail) return;
        if (!studentScores[email]) studentScores[email] = {};
        studentScores[email][name] = { label: 'Väntar på facit' };
      });
      return;
    }

    register.getRange(registerRowNum, 10, 1, 2).setValues([['Ja', facitResponse.getTimestamp()]]);

    const facitAnswers = {};
    const itemTitles = {};
    facitResponse.getItemResponses().forEach(function (ir) {
      facitAnswers[ir.getItem().getId()] = normalizeAnswer(ir.getResponse());
      itemTitles[ir.getItem().getId()] = ir.getItem().getTitle();
    });

    const statsById = {};

    responses.forEach(function (response) {
      const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
      if (!email || email === creatorEmail) return;
      if (!studentScores[email]) studentScores[email] = {};

      let score = 0, max = 0;
      response.getItemResponses().forEach(function (ir) {
        const itemId = ir.getItem().getId();
        const points = pointsMap[itemId];
        if (!points || facitAnswers[itemId] === undefined) return;

        max += points;
        if (!statsById[itemId]) {
          statsById[itemId] = { title: itemTitles[itemId], correct: 0, answered: 0 };
        }
        statsById[itemId].answered++;

        if (normalizeAnswer(ir.getResponse()) === facitAnswers[itemId]) {
          score += points;
          statsById[itemId].correct++;
        }
      });

      studentScores[email][name] = { score: score, max: max };
    });

    const stats = Object.keys(statsById).map(function (itemId) {
      const s = statsById[itemId];
      return { title: s.title, percentage: Math.round((s.correct / s.answered) * 100), answered: s.answered };
    });
    if (stats.length) questionStatsByForm.push({ formName: name, stats: stats });
  });

  const studentEmails = Object.keys(studentScores).sort(function (a, b) { return a.localeCompare(b, 'sv'); });
  const header = ['Elev (e-post)'].concat(formHeaders);
  const rows = [];
  const backgrounds = [];

  studentEmails.forEach(function (email) {
    const row = [email];
    const bgRow = [null];

    formHeaders.forEach(function (fn) {
      const entry = studentScores[email][fn];
      if (entry === undefined) {
        row.push('–');
        bgRow.push(null);
        return;
      }
      if (entry.label) {
        row.push(entry.label);
        bgRow.push(null);
      } else {
        row.push(entry.score + '/' + entry.max);
        const pct = entry.max > 0 ? (entry.score / entry.max) * 100 : 0;
        bgRow.push(colorForPercentage(pct));
      }
    });

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
 * vilka frågor som är extra svåra för klassen. Bygger på samma facit-jämförelse som
 * elevpoängen, så både flervalsfrågor och kortsvar tas med här.
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
