/**
 * Skickar automatiskt ett mejl till en elev med resultatet på flervalsfrågorna, så
 * snart det går att räkna ut - dvs när facit finns (läraren har svarat på formuläret).
 *
 * Bygger på EN installable "Vid formulärinlämning"-trigger på kalkylarket (installeras
 * automatiskt i createFormFromWizard, se FormBuilder.gs) som täcker ALLA formulär som
 * skapas via guiden, eftersom de alla har samma kalkylark som svarsdestination.
 *
 * Ordning spelar ingen roll: svarar en elev INNAN läraren har svarat (facit saknas än)
 * skickas inget mejl då - men så fort läraren sedan svarar (och facit finns) körs en
 * "ikapphämtning" som mejlar alla elever som redan svarat men ännu inte fått sitt mejl.
 * Varje elevsvar mejlas bara EN gång (spåras via svars-ID i Formulärregistret) - rättar
 * läraren sitt facit-svar i efterhand skickas inga nya mejl till redan mejlade elever.
 *
 * Kortsvarsformulär (inga flervalsfrågor) har inget att mejla - de rättas inte alls.
 *
 * Mejlet skickas som HTML (med en textversion som reserv) och färgkodas med samma
 * röd/gul/grön-skala som 📊 Resultat-fliken - se sendResultEmail().
 *
 * Har en elev tappat bort sitt mejl kan läraren skicka om det manuellt till en
 * specifik e-postadress via menyn "✉️ Skicka om resultatmejl" - se
 * showResendMailDialog() och resendResultEmail() längst ner i filen.
 */

function installMailTrigger() {
  const alreadyInstalled = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onFormSubmitMailResults';
  });
  if (alreadyInstalled) return;

  ScriptApp.newTrigger('onFormSubmitMailResults')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
}

function onFormSubmitMailResults(e) {
  if (!e || !e.range) return;

  const ss = SpreadsheetApp.getActive();
  const register = ss.getSheetByName(SHEET_NAMES.REGISTER);
  const lastRow = register.getLastRow();
  if (lastRow < 2) return;

  const responseSheetName = e.range.getSheet().getName();
  const registerValues = register.getRange(2, 1, lastRow - 1, 13).getValues();

  for (let i = 0; i < registerValues.length; i++) {
    const r = registerValues[i];
    if (r[6] !== responseSheetName) continue; // Svarsflik-kolumnen
    mailResultsForForm_(register, i + 2, r);
    return;
  }
}

function mailResultsForForm_(register, rowNum, r) {
  const id = r[0];
  const name = r[1];
  const creatorEmail = String(r[3] || '').trim().toLowerCase();
  const pointsMap = parsePointsMap(r[11]);
  if (Object.keys(pointsMap).length === 0) return; // Inga poängsatta frågor - inget resultat att mejla.

  let form;
  try {
    form = FormApp.openById(id);
  } catch (err) {
    return; // Formuläret har troligen tagits bort manuellt i Drive.
  }

  const responses = form.getResponses();
  const facitResponse = findFacitResponse(responses, creatorEmail);
  if (!facitResponse) return; // Facit saknas än - mejlas i ikapphämtningen när läraren svarat.

  const facitAnswers = {};
  facitResponse.getItemResponses().forEach(function (ir) {
    facitAnswers[ir.getItem().getId()] = normalizeAnswer(ir.getResponse());
  });

  const alreadyMailed = parseMailedIds(r[12]);
  const newlyMailed = [];

  responses.forEach(function (response) {
    const email = String(response.getRespondentEmail() || '').trim().toLowerCase();
    if (!email || email === creatorEmail) return;
    const responseId = response.getId();
    if (alreadyMailed.indexOf(responseId) !== -1) return;

    const result = scoreResponse(response.getItemResponses(), facitAnswers, pointsMap);
    sendResultEmail(email, name, result.score, result.max);
    newlyMailed.push(responseId);
  });

  if (newlyMailed.length > 0) {
    register.getRange(rowNum, 13).setValue(JSON.stringify(alreadyMailed.concat(newlyMailed)));
  }
}

function parseMailedIds(json) {
  try {
    return JSON.parse(json || '[]');
  } catch (e) {
    return [];
  }
}

function scoreResponse(itemResponses, facitAnswers, pointsMap) {
  let score = 0, max = 0;
  itemResponses.forEach(function (ir) {
    const itemId = ir.getItem().getId();
    const points = pointsMap[itemId];
    if (!points || facitAnswers[itemId] === undefined) return;

    max += points;
    if (normalizeAnswer(ir.getResponse()) === facitAnswers[itemId]) score += points;
  });
  return { score: score, max: max };
}

/**
 * Skickar resultatet som ett formaterat HTML-mejl (med textversion som reserv för
 * mejlklienter som inte visar HTML). Färgen på resultatrutan är samma
 * röd/gul/grön-skala som i 📊 Resultat-fliken (colorForPercentage i Results.gs).
 */
function sendResultEmail(email, formName, score, max) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const boxColor = colorForPercentage(pct);
  const subject = 'Ditt resultat: ' + formName;

  const plainBody = 'Hej!\n\n' +
    'Ditt resultat på "' + formName + '": ' + score + ' av ' + max + ' poäng (' + pct + ' %).\n\n' +
    '(Eventuella kortsvarsfrågor i samma formulär rättas inte automatiskt och räknas inte in ovan.)\n\n' +
    'Det här mejlet har skickats automatiskt.';

  const htmlBody =
    '<div style="font-family: Arial, Helvetica, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">' +
      '<h2 style="margin: 0 0 4px; color: #202124; font-size: 18px;">' + escapeHtml(formName) + '</h2>' +
      '<p style="margin: 0 0 20px; color: #5f6368; font-size: 13px;">Ditt resultat</p>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
        'style="background:' + boxColor + '; border-radius: 10px;">' +
        '<tr><td style="padding: 20px 24px; text-align: center;">' +
          '<div style="font-size: 32px; font-weight: bold; color: #202124;">' + score + ' / ' + max + '</div>' +
          '<div style="font-size: 15px; color: #202124; margin-top: 4px;">' + pct + ' % rätt</div>' +
        '</td></tr>' +
      '</table>' +
      '<p style="font-size: 12px; color: #999; margin-top: 20px; line-height: 1.5;">' +
        'Eventuella kortsvarsfrågor i samma formulär rättas inte automatiskt och räknas inte in ovan.<br>' +
        'Det här mejlet har skickats automatiskt.' +
      '</p>' +
    '</div>';

  MailApp.sendEmail({ to: email, subject: subject, body: plainBody, htmlBody: htmlBody });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showResendMailDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ResendMail').setWidth(420).setHeight(320);
  SpreadsheetApp.getUi().showModalDialog(html, 'Skicka om resultatmejl');
}

/**
 * Anropas från ResendMail.html. Listar bara formulär som har poängsatta (flervals-)
 * frågor - kortsvarsformulär har inget resultat att mejla.
 */
function getMailableForms() {
  const ss = SpreadsheetApp.getActive();
  const register = ss.getSheetByName(SHEET_NAMES.REGISTER);
  const lastRow = register.getLastRow();
  if (lastRow < 2) return [];

  const registerValues = register.getRange(2, 1, lastRow - 1, 12).getValues();
  return registerValues
    .filter(function (r) { return r[0] && Object.keys(parsePointsMap(r[11])).length > 0; })
    .map(function (r) { return { id: r[0], name: r[1] }; });
}

/**
 * Anropas från ResendMail.html. Räknar om poängen mot AKTUELLT facit (inte det som
 * eventuellt gällde när eleven ursprungligen mejlades - se anmärkningen i
 * mailResultsForForm_) och skickar samma HTML-mejl som vid automatisk utskick.
 */
function resendResultEmail(formId, studentEmail) {
  const email = String(studentEmail || '').trim().toLowerCase();
  if (!email) throw new Error('Ange elevens e-postadress.');

  const ss = SpreadsheetApp.getActive();
  const register = ss.getSheetByName(SHEET_NAMES.REGISTER);
  const lastRow = register.getLastRow();
  const registerValues = lastRow >= 2 ? register.getRange(2, 1, lastRow - 1, 13).getValues() : [];

  let rowNum = -1;
  let r = null;
  for (let i = 0; i < registerValues.length; i++) {
    if (registerValues[i][0] === formId) { rowNum = i + 2; r = registerValues[i]; break; }
  }
  if (!r) throw new Error('Formuläret hittades inte i registret.');

  const name = r[1];
  const creatorEmail = String(r[3] || '').trim().toLowerCase();
  const pointsMap = parsePointsMap(r[11]);
  if (Object.keys(pointsMap).length === 0) {
    throw new Error('"' + name + '" har inga poängsatta frågor - det finns inget resultat att skicka.');
  }

  let form;
  try {
    form = FormApp.openById(formId);
  } catch (err) {
    throw new Error('Formuläret kunde inte öppnas (kan ha tagits bort i Drive).');
  }

  const responses = form.getResponses();
  const facitResponse = findFacitResponse(responses, creatorEmail);
  if (!facitResponse) {
    throw new Error('Du har inte svarat på "' + name + '" än, så det finns inget facit att räkna resultatet mot.');
  }

  const facitAnswers = {};
  facitResponse.getItemResponses().forEach(function (ir) {
    facitAnswers[ir.getItem().getId()] = normalizeAnswer(ir.getResponse());
  });

  const studentResponse = responses.find(function (response) {
    return String(response.getRespondentEmail() || '').trim().toLowerCase() === email;
  });
  if (!studentResponse) {
    throw new Error('Ingen elev med den e-postadressen har svarat på "' + name + '" än.');
  }

  const result = scoreResponse(studentResponse.getItemResponses(), facitAnswers, pointsMap);
  sendResultEmail(email, name, result.score, result.max);

  const alreadyMailed = parseMailedIds(r[12]);
  const responseId = studentResponse.getId();
  if (alreadyMailed.indexOf(responseId) === -1) {
    alreadyMailed.push(responseId);
    register.getRange(rowNum, 13).setValue(JSON.stringify(alreadyMailed));
  }

  return { formName: name, score: result.score, max: result.max };
}
