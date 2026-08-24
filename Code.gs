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
    '<li>Fyll i frågor i flikarna <b>Flervalsfrågor</b> och/eller <b>Kortsvar</b> (en rad per fråga). Skriv ' +
    'frågan i klartext, eller bara ett nummer om eleverna redan har frågan på annat håll (t.ex. papper).</li>' +
    '<li>Öppna <b>Skapa Formulär &gt; Nytt formulär (guide)</b> i menyn och följ stegen.</li>' +
    '<li><b>Viktigt:</b> När formuläret är skapat, öppna det och svara på det själv - precis som en elev, med ' +
    'samma Google-konto som skapade formuläret. Ditt svar blir facit som alla elevsvar rättas mot, både ' +
    'flervalsfrågor och kortsvar. Svarar du fel av misstag går det bra att svara om - senaste svaret gäller.</li>' +
    '<li>Formuläret skapas i samma Drive-mapp som kalkylarket. Svaren hamnar automatiskt i en ny flik här i arket. ' +
    'Eleverna identifieras via sin verifierade e-post - ingen namnfråga behövs.</li>' +
    '<li>Klicka på <b>Uppdatera resultatsidan</b> när du vill se en sammanställning per elev, över alla formulär. ' +
    'Facit hämtas automatiskt från ditt eget svar varje gång du uppdaterar.</li>' +
    '</ol>' +
    '<p><b>Tips:</b> Vill en kollega använda samma mall? Låt dem göra <i>Arkiv &gt; Skapa en kopia</i> på det här arket. ' +
    'Deras kopia startar med tomma flikar och ett eget formulärregister.</p>' +
    '</div>'
  ).setWidth(460).setHeight(440);
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
