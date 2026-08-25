/**
 * Guiden för att skapa ett nytt formulär utifrån fliken Frågor.
 *
 * Elever identifieras via verifierad e-post (formulärinställningen "Samla in
 * e-postadresser: Verifierad" - eleven måste logga in med sitt Google-konto, och
 * skriver aldrig in e-posten själv) - ingen egen "Namn"-fråga behövs.
 *
 * Rättning av flervalsfrågor sker INTE via kalkylarket. Efter att formuläret skapats
 * svarar läraren på det själv (precis som en elev) - det svaret blir facit som
 * elevernas svar jämförs mot. Se Results.gs för själva rättningen, och Mailer.gs för
 * det automatiska resultatmejlet till eleven.
 *
 * Kortsvar rättas inte alls - det är öppna frågor. Resultatsidan visar bara om en
 * elev har svarat på formuläret eller inte (svaren går att läsa i svarsfliken).
 */

function showNewFormWizard() {
  const counts = getQuestionCounts();

  const template = HtmlService.createTemplateFromFile('Wizard');
  template.mcCount = counts.mcCount;
  template.saCount = counts.saCount;
  template.incompleteRows = counts.incompleteRows;

  const html = template.evaluate().setWidth(480).setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nytt formulär – guide');
}

/**
 * Anropas både när guiden öppnas och från "🔄 Uppdatera"-knappen i Wizard.html,
 * så att läraren kan fylla i frågor i bakgrunden och uppdatera antalet utan att
 * behöva stänga och öppna om hela guiden (och tappa ett redan ifyllt namn).
 */
function getQuestionCounts() {
  const ss = SpreadsheetApp.getActive();
  const parsed = readQuestionRows(ss.getSheetByName(SHEET_NAMES.QUESTIONS));
  return {
    mcCount: parsed.mcRows.length,
    saCount: parsed.saRows.length,
    incompleteRows: parsed.incompleteRows
  };
}

/**
 * Anropas från Wizard.html. Bygger formuläret, länkar svaren till detta ark,
 * flyttar formuläret till samma Drive-mapp, loggar i registret och rensar byggfliken.
 */
function createFormFromWizard(options) {
  const name = (options && options.name || '').trim();
  if (!name) {
    throw new Error('Du måste ange ett namn på formuläret.');
  }

  const ss = SpreadsheetApp.getActive();
  const questionsSheet = ss.getSheetByName(SHEET_NAMES.QUESTIONS);
  const parsed = readQuestionRows(questionsSheet);
  const mcRows = parsed.mcRows;
  const saRows = parsed.saRows;

  if (mcRows.length === 0 && saRows.length === 0) {
    throw new Error('Lägg till minst en fråga i fliken "Frågor" innan du skapar formuläret.');
  }

  const form = FormApp.create(name);
  // VERIFIED (inte det föråldrade setCollectEmail) kräver Google-inloggning och hämtar
  // e-posten automatiskt - eleven skriver aldrig in den själv.
  form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED);

  let questionNumber = 0;
  const itemsMeta = []; // Bara flervalsfrågor - de är enda typen som poängsätts/rättas.
  mcRows.forEach(function (row) {
    questionNumber++;
    itemsMeta.push(addMultipleChoiceItem(form, row, questionNumber));
  });
  saRows.forEach(function (row) {
    questionNumber++;
    addShortAnswerItem(form, row, questionNumber);
  });

  const responseSheetName = linkFormToSpreadsheet(form, ss, name);
  moveFormToSpreadsheetFolder(form, ss);
  logFormInRegister(ss, form, name, responseSheetName, mcRows.length, saRows.length, itemsMeta);

  try {
    installMailTrigger(); // Se Mailer.gs. Görs här - garanterat fullt auktoriserad kontext.
  } catch (err) {
    // Misslyckas installationen (t.ex. redan max antal triggers) fungerar allt annat ändå -
    // eleverna får bara inget automatiskt resultatmejl förrän triggern installerats manuellt.
  }

  clearWorkingRows(questionsSheet, 3);

  return {
    editUrl: form.getEditUrl(),
    publishUrl: form.getPublishedUrl(),
    responseSheetName: responseSheetName
  };
}

/**
 * Frågans rubrik i formuläret. Skriver läraren bara ett nummer (t.ex. "7") används
 * det numret rakt av ("Fråga 7") - praktiskt när eleverna redan har frågetexten på
 * papper eller annat håll och numren behöver stämma med det. Lämnas fältet helt tomt
 * används frågans ordningsnummer i formuläret istället.
 */
function questionTitle(raw, fallbackIndex) {
  const trimmed = String(raw || '').trim();
  if (trimmed === '') return 'Fråga ' + fallbackIndex;
  if (/^\d+$/.test(trimmed)) return 'Fråga ' + trimmed;
  return trimmed;
}

function addMultipleChoiceItem(form, row, questionNumber) {
  const item = form.addMultipleChoiceItem();
  item.setTitle(questionTitle(row.question, questionNumber)).setRequired(true);
  item.setChoices(row.options.map(function (opt) { return item.createChoice(opt); }));
  return { itemId: item.getId(), points: row.points };
}

function addShortAnswerItem(form, row, questionNumber) {
  const item = form.addTextItem();
  item.setTitle(questionTitle(row.question, questionNumber)).setRequired(false);
}

function linkFormToSpreadsheet(form, ss, name) {
  const beforeNames = ss.getSheets().map(function (s) { return s.getName(); });
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  const newSheet = ss.getSheets().filter(function (s) {
    return beforeNames.indexOf(s.getName()) === -1;
  })[0];
  if (!newSheet) return '';

  const desiredName = ('Svar - ' + name).substring(0, 100);
  try {
    newSheet.setName(desiredName);
    return desiredName;
  } catch (e) {
    return newSheet.getName();
  }
}

function moveFormToSpreadsheetFolder(form, ss) {
  try {
    const ssFile = DriveApp.getFileById(ss.getId());
    const parents = ssFile.getParents();
    if (!parents.hasNext()) return; // Kalkylarket ligger i Drive-roten, inget att flytta till.
    const folder = parents.next();

    const formFile = DriveApp.getFileById(form.getId());
    folder.addFile(formFile);
    const currentParents = formFile.getParents();
    while (currentParents.hasNext()) {
      const p = currentParents.next();
      if (p.getId() !== folder.getId()) {
        p.removeFile(formFile);
      }
    }
  } catch (err) {
    // Misslyckas flytten (t.ex. delad enhet med andra rättigheter) ligger formuläret
    // kvar där det skapades - det är fortfarande fullt fungerande.
  }
}

function logFormInRegister(ss, form, name, responseSheetName, mcCount, saCount, itemsMeta) {
  const sheet = ss.getSheetByName(SHEET_NAMES.REGISTER);
  sheet.appendRow([
    form.getId(), name, new Date(), Session.getActiveUser().getEmail(),
    form.getEditUrl(), form.getPublishedUrl(), responseSheetName,
    mcCount, saCount, 'Nej', '', JSON.stringify(itemsMeta), '[]'
  ]);
}

function clearWorkingRows(sheet, startRow) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clearContent();
  }
}

/**
 * Läser fliken Frågor (Fråga, Typ, Alternativ 1-5, Poäng) och delar upp raderna i
 * flervalsfrågor och kortsvarsfrågor utifrån Typ-kolumnen.
 *
 * incompleteRows listar radnummer som har NÅGOT innehåll men inte kan användas:
 * antingen saknas Typ, eller så är Typ "Flerval" men färre än 2 alternativ är
 * ifyllda. Utan den här listan försvinner sådana rader helt tyst - se Wizard.html.
 */
function readQuestionRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { mcRows: [], saRows: [], incompleteRows: [] };

  const values = sheet.getRange(3, 1, lastRow - 2, 8).getValues(); // Fråga, Typ, Alternativ 1-5, Poäng
  const mcRows = [];
  const saRows = [];
  const incompleteRows = [];

  values.forEach(function (v, i) {
    const rowNum = 3 + i;
    const question = String(v[0]).trim();
    const type = String(v[1]).trim();

    const options = [];
    for (let j = 0; j < 5; j++) {
      const value = String(v[2 + j]).trim();
      if (value !== '') options.push(value);
    }
    const hasAnyContent = question !== '' || type !== '' || options.length > 0;
    if (!hasAnyContent) return; // Helt tom rad.

    if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      if (options.length < 2) { incompleteRows.push(rowNum); return; }
      const points = Number(v[7]) > 0 ? Number(v[7]) : 1;
      mcRows.push({ question: question, options: options, points: points });
    } else if (type === QUESTION_TYPES.SHORT_ANSWER) {
      if (!question) { incompleteRows.push(rowNum); return; }
      saRows.push({ question: question });
    } else {
      incompleteRows.push(rowNum); // Ingen (giltig) Typ vald än.
    }
  });

  return { mcRows: mcRows, saRows: saRows, incompleteRows: incompleteRows };
}
