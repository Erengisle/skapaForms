/**
 * Skapa Formulär
 * Meny, hjälp och grundinställning av mallens flikar.
 */

const SHEET_NAMES = {
  MULTIPLE_CHOICE: 'Flervalsfrågor',
  SHORT_ANSWER: 'Kortsvar',
  REGISTER: 'Formulärregister',
  RESULTS: '📊 Resultat'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Skapa Formulär')
    .addItem('🆕 Nytt formulär (guide)', 'showNewFormWizard')
    .addItem('📊 Uppdatera resultatsidan', 'updateResultsSheet')
    .addSeparator()
    .addItem('📋 Visa formulärregister', 'showRegisterSheet')
    .addItem('🔧 Kontrollera/reparera mallen', 'setupTemplateSheets')
    .addItem('❓ Hjälp', 'showHelp')
    .addToUi();

  // Säkerställer att alla flikar finns, t.ex. direkt efter att någon kopierat mallen.
  setupTemplateSheets();
}

function showHelp() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6;">' +
    '<h3>Så här använder du mallen</h3>' +
    '<ol>' +
    '<li>Fyll i frågor i flikarna <b>Flervalsfrågor</b> och/eller <b>Kortsvar</b> (en rad per fråga).</li>' +
    '<li>Öppna <b>Skapa Formulär &gt; Nytt formulär (guide)</b> i menyn och följ stegen.</li>' +
    '<li>Formuläret skapas i samma Drive-mapp som kalkylarket. Svaren hamnar automatiskt i en ny flik här i arket. ' +
    'Eleverna identifieras via sin verifierade e-post - ingen namnfråga behövs.</li>' +
    '<li>Flervalsfrågor med rätt svar rättas automatiskt av Google Forms. Kortsvar är öppna frågor utan facit - ' +
    'svaren går att läsa i svarsfliken, men räknas inte in i poängen.</li>' +
    '<li>Klicka på <b>Uppdatera resultatsidan</b> när du vill se en sammanställning per elev, över alla formulär.</li>' +
    '</ol>' +
    '<p><b>Tips:</b> Vill en kollega använda samma mall? Låt dem göra <i>Arkiv &gt; Skapa en kopia</i> på det här arket. ' +
    'Deras kopia startar med tomma flikar och ett eget formulärregister.</p>' +
    '</div>'
  ).setWidth(440).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Hjälp – Skapa Formulär');
}

function showRegisterSheet() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_NAMES.REGISTER);
  sheet.showSheet();
  ss.setActiveSheet(sheet);
}

function setupTemplateSheets() {
  const ss = SpreadsheetApp.getActive();
  setupMultipleChoiceSheet(ss);
  setupShortAnswerSheet(ss);
  setupRegisterSheet(ss);
  setupResultsSheet(ss);
}
