/**
 * Facit för kortsvarsfrågor.
 *
 * Istället för att läraren skriver in rätt svar i kalkylarket, svarar läraren själv
 * på formuläret (med sin egen inloggning) direkt efter att det skapats. Den här
 * filen letar upp lärarens svar - identifierat via verifierad e-post - och sparar
 * det som facit i Formulärregister. Körs automatiskt varje gång resultatsidan
 * uppdateras, så inget extra menyval behövs.
 */

const REGISTER_COLUMNS = {
  ID: 1, NAME: 2, CREATED: 3, CREATED_BY: 4, EDIT_URL: 5, PUBLISH_URL: 6,
  RESPONSE_SHEET: 7, IS_QUIZ: 8, MC_COUNT: 9, SA_COUNT: 10,
  TEACHER_EMAIL: 11, FACIT_STATUS: 12, FACIT_JSON: 13
};
const REGISTER_NUM_COLUMNS = 13;
const FACIT_STATUS_WAITING = 'Väntar på lärarens svar';

function collectPendingFacits(register) {
  const lastRow = register.getLastRow();
  if (lastRow < 2) return;

  const range = register.getRange(2, 1, lastRow - 1, REGISTER_NUM_COLUMNS);
  const values = range.getValues();

  values.forEach(function (row, i) {
    const status = row[REGISTER_COLUMNS.FACIT_STATUS - 1];
    const saCount = row[REGISTER_COLUMNS.SA_COUNT - 1];
    if (saCount <= 0 || status !== FACIT_STATUS_WAITING) return;

    const formId = row[REGISTER_COLUMNS.ID - 1];
    const teacherEmail = String(row[REGISTER_COLUMNS.TEACHER_EMAIL - 1] || '').trim().toLowerCase();
    if (!formId || !teacherEmail) return;

    let form;
    try {
      form = FormApp.openById(formId);
    } catch (e) {
      return; // Formuläret har troligen tagits bort manuellt i Drive.
    }

    const teacherResponse = findResponseByEmail(form, teacherEmail);
    if (!teacherResponse) return; // Läraren har inte svarat än - försök igen nästa gång.

    const facitEntries = JSON.parse(row[REGISTER_COLUMNS.FACIT_JSON - 1] || '[]');
    form.getItems().forEach(function (item) {
      if (item.getType() !== FormApp.ItemType.TEXT) return;
      const entry = facitEntries.filter(function (e) { return e.title === item.getTitle(); })[0];
      if (!entry) return;
      const ir = teacherResponse.getResponseForItem(item);
      entry.correctAnswer = ir ? String(ir.getResponse()).trim() : '';
    });

    const rowIndex = 2 + i;
    register.getRange(rowIndex, REGISTER_COLUMNS.FACIT_JSON).setValue(JSON.stringify(facitEntries));
    register.getRange(rowIndex, REGISTER_COLUMNS.FACIT_STATUS)
      .setValue('Hämtat: ' + new Date().toLocaleString('sv-SE'));
  });
}

/**
 * Om läraren har svarat flera gånger (t.ex. rättat ett misstag) används det
 * senast inskickade svaret som facit.
 */
function findResponseByEmail(form, email) {
  const responses = form.getResponses();
  let match = null;
  responses.forEach(function (response) {
    const respondent = String(response.getRespondentEmail() || '').trim().toLowerCase();
    if (respondent === email) match = response;
  });
  return match;
}
