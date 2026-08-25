/**
 * Skapa Formulär
 * Meny, hjälp och grundinställning av mallens flikar.
 */

const SHEET_NAMES = {
  QUESTIONS: 'Frågor',
  REGISTER: 'Formulärregister',
  RESULTS: '📊 Resultat'
};

const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'Flerval',
  SHORT_ANSWER: 'Kortsvar'
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
    '<li>Skriv frågor (eller bara ett nummer om eleverna redan har frågan på papper) i fliken <b>Frågor</b> - ' +
    'en rad per fråga.</li>' +
    '<li>Välj <b>Typ</b> för varje rad: "Flerval" (fyll då även i minst 2 Alternativ) eller "Kortsvar" ' +
    '(öppen fråga, inga alternativ behövs).</li>' +
    '<li>Öppna <b>Skapa Formulär &gt; Nytt formulär (guide)</b> i menyn och följ stegen.</li>' +
    '<li><b>Viktigt (bara om formuläret har flervalsfrågor):</b> Öppna formuläret och svara på det själv - precis ' +
    'som en elev, med samma Google-konto som skapade formuläret. Ditt svar blir facit som elevernas svar rättas ' +
    'mot. Svarar du fel av misstag går det bra att svara om - senaste svaret gäller.</li>' +
    '<li>Formuläret skapas i samma Drive-mapp som kalkylarket. Svaren hamnar automatiskt i en ny flik här i arket. ' +
    'Eleverna måste logga in med sitt Google-konto för att svara - e-posten hämtas då automatiskt (verifierad), ' +
    'ingen namnfråga eller e-postfråga behövs.</li>' +
    '<li>Kortsvar rättas inte - det är öppna frågor. På resultatsidan ser du om en elev har svarat eller inte; ' +
    'själva svaren läser du i formulärets svarsflik.</li>' +
    '<li><b>Eleven får automatiskt ett mejl med sitt resultat</b> (poäng på flervalsfrågorna) så snart facit ' +
    'finns - antingen direkt vid svar, eller i efterhand så fort du själv har svarat på formuläret.</li>' +
    '<li>Klicka på <b>Uppdatera resultatsidan</b> när du vill se en sammanställning per elev, över alla formulär, ' +
    'och en frågeanalys som visar vilka frågor klassen tyckte var svårast.</li>' +
    '</ol>' +
    '<p><b>Tips:</b> Vill en kollega använda samma mall? Låt dem göra <i>Arkiv &gt; Skapa en kopia</i> på det här arket. ' +
    'Deras kopia startar med tomma flikar och ett eget formulärregister.</p>' +
    '</div>'
  ).setWidth(460).setHeight(480);
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
  setupQuestionsSheet(ss);
  setupRegisterSheet(ss);
  setupResultsSheet(ss);
}
