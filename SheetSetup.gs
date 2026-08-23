/**
 * Skapar (eller kompletterar) mallens flikar med rubriker och instruktioner.
 * Alla funktioner är säkra att köra flera gånger - de gör ingenting om fliken redan finns.
 */

function setupMultipleChoiceSheet(ss) {
  if (ss.getSheetByName(SHEET_NAMES.MULTIPLE_CHOICE)) return;
  const sheet = ss.insertSheet(SHEET_NAMES.MULTIPLE_CHOICE);

  sheet.getRange('A1:H1').merge()
    .setValue('Bygg flervalsfrågor för NÄSTA formulär du skapar. Fyll i en rad per fråga (minst 2 alternativ). ' +
      'Fyll i "Rätt alternativ" och "Poäng" om frågan ska rättas automatiskt. Raderna rensas automatiskt när ' +
      'formuläret skapas - frågorna sparas i fliken Formulärregister.')
    .setWrap(true).setFontStyle('italic').setBackground('#f3f3f3');
  sheet.setRowHeight(1, 46);

  const headers = ['Fråga', 'Alternativ 1', 'Alternativ 2', 'Alternativ 3', 'Alternativ 4', 'Alternativ 5', 'Rätt alternativ (1-5)', 'Poäng'];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.setFrozenRows(2);
  sheet.autoResizeColumns(1, headers.length);
}

function setupShortAnswerSheet(ss) {
  if (ss.getSheetByName(SHEET_NAMES.SHORT_ANSWER)) return;
  const sheet = ss.insertSheet(SHEET_NAMES.SHORT_ANSWER);

  sheet.getRange('A1').merge()
    .setValue('Bygg kortsvarsfrågor för NÄSTA formulär du skapar. Detta är öppna frågor utan facit eller poäng - ' +
      'svaren går att läsa i formulärets svarsflik, men räknas inte in i resultatsammanställningen. ' +
      'Raderna rensas automatiskt när formuläret skapas.')
    .setWrap(true).setFontStyle('italic').setBackground('#f3f3f3');
  sheet.setRowHeight(1, 46);

  const headers = ['Fråga'];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#cfe2f3');
  sheet.setFrozenRows(2);
  sheet.autoResizeColumns(1, headers.length);
}

function setupRegisterSheet(ss) {
  if (ss.getSheetByName(SHEET_NAMES.REGISTER)) return;
  const sheet = ss.insertSheet(SHEET_NAMES.REGISTER);

  const headers = [
    'Formulär-ID', 'Namn', 'Skapat', 'Skapad av', 'Redigeringslänk', 'Svara-länk',
    'Svarsflik', 'Poängsatt (flerval)', 'Antal flervalsfrågor', 'Antal kortsvarsfrågor'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e0e0e0');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  sheet.hideSheet();
}

function setupResultsSheet(ss) {
  if (ss.getSheetByName(SHEET_NAMES.RESULTS)) return;
  const sheet = ss.insertSheet(SHEET_NAMES.RESULTS);
  sheet.getRange('A1')
    .setValue('Klicka på "Skapa Formulär > Uppdatera resultatsidan" i menyn för att fylla i denna flik.')
    .setFontStyle('italic');
}
