/**
 * Bygger om resultatsidan från grunden varje gång den anropas, genom att läsa alla
 * formulär i registret och räkna om aktuella poäng. Det gör att även poäng du
 * rättat manuellt för kortsvar i Google Forms plockas upp vid nästa uppdatering.
 */

function updateResultsSheet() {
  const ss = SpreadsheetApp.getActive();
  const register = ss.getSheetByName(SHEET_NAMES.REGISTER);
  const resultsSheet = ss.getSheetByName(SHEET_NAMES.RESULTS);

  resultsSheet.clear();
  resultsSheet.getRange('A1')
    .setValue('Sammanställning uppdaterad: ' + new Date().toLocaleString('sv-SE'))
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

  const studentScores = {}; // elevnamn -> { formulärnamn: "poäng/max" eller "✓" }
  const formHeaders = [];

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
    const nameItem = items.length ? items[0] : null; // Alltid "Namn"-frågan, tillagd först.

    form.getResponses().forEach(function (response) {
      let studentName = '(okänt namn)';
      if (nameItem) {
        const ir = response.getResponseForItem(nameItem);
        if (ir && String(ir.getResponse()).trim()) {
          studentName = String(ir.getResponse()).trim();
        }
      }
      if (!studentScores[studentName]) studentScores[studentName] = {};
      studentScores[studentName][f.name] = isQuiz
        ? (response.getTotalScore() + '/' + maxScore)
        : '✓';
    });
  });

  const studentNames = Object.keys(studentScores).sort(function (a, b) { return a.localeCompare(b, 'sv'); });
  const header = ['Elev'].concat(formHeaders).concat(['Antal formulär besvarade']);
  const rows = studentNames.map(function (name) {
    const row = [name];
    let answered = 0;
    formHeaders.forEach(function (fn) {
      const val = studentScores[name][fn];
      if (val !== undefined) answered++;
      row.push(val !== undefined ? val : '–');
    });
    row.push(answered);
    return row;
  });

  const startRow = 3;
  resultsSheet.getRange(startRow, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#d9ead3');
  if (rows.length) {
    resultsSheet.getRange(startRow + 1, 1, rows.length, header.length).setValues(rows);
  } else {
    resultsSheet.getRange(startRow + 1, 1).setValue('Inga svar har kommit in ännu.');
  }
  resultsSheet.setFrozenRows(startRow);
  resultsSheet.autoResizeColumns(1, header.length);
}

function computeMaxScore(form) {
  let max = 0;
  form.getItems().forEach(function (item) {
    try {
      const type = item.getType();
      if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
        max += item.asMultipleChoiceItem().getPoints();
      } else if (type === FormApp.ItemType.TEXT) {
        max += item.asTextItem().getPoints();
      } else if (type === FormApp.ItemType.CHECKBOX) {
        max += item.asCheckboxItem().getPoints();
      }
    } catch (e) {
      // Icke-poängsatta objekttyper ignoreras.
    }
  });
  return max;
}
