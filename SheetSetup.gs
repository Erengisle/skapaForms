/**
 * Skapar (eller kompletterar) mallens flikar med rubriker och instruktioner.
 * Alla funktioner är säkra att köra flera gånger - de gör ingenting om fliken redan finns.
 */

function setupQuestionsSheet(ss) {
  if (ss.getSheetByName(SHEET_NAMES.QUESTIONS)) return;
  const sheet = ss.insertSheet(SHEET_NAMES.QUESTIONS);

  sheet.getRange('A1:H1').merge()
    .setValue('Bygg frågor för NÄSTA formulär du skapar - en rad per fråga. 1) Skriv frågan i Fråga-kolumnen, ' +
      'eller bara ett nummer (t.ex. "3") om eleverna redan har frågetexten på annat håll. 2) Välj Typ: ' +
      '"Flerval" (kräver minst 2 ifyllda Alternativ-kolumner) eller "Kortsvar" (öppen fråga, inga alternativ ' +
      'behövs). Flervalsfrågor rättas automatiskt mot ditt eget svar på formuläret (facit) - ange gärna Poäng, ' +
      'annars räknas frågan som 1 poäng värd. Kortsvar rättas inte - resultatsidan visar bara om eleven svarat. ' +
      'Raderna rensas automatiskt när formuläret skapas.')
    .setWrap(true).setFontStyle('italic').setBackground('#f3f3f3');
  sheet.setRowHeight(1, 88);

  const headers = ['Fråga', 'Typ', 'Alternativ 1', 'Alternativ 2', 'Alternativ 3', 'Alternativ 4', 'Alternativ 5', 'Poäng'];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.setFrozenRows(2);

  // Dropdown i Typ-kolumnen, förifylld för en hel klass rader i förväg.
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.SHORT_ANSWER], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(3, 2, 300, 1).setDataValidation(typeRule);

  sheet.autoResizeColumns(1, headers.length);
}

function setupRegisterSheet(ss) {
  if (ss.getSheetByName(SHEET_NAMES.REGISTER)) return;
  const sheet = ss.insertSheet(SHEET_NAMES.REGISTER);

  const headers = [
    'Formulär-ID', 'Namn', 'Skapat', 'Skapad av (e-post)', 'Redigeringslänk', 'Svara-länk',
    'Svarsflik', 'Antal flervalsfrågor', 'Antal kortsvarsfrågor', 'Facit hämtat', 'Facit hämtat (datum)',
    'Frågedata (JSON)', 'Mejlade svar-ID:n (JSON)'
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
