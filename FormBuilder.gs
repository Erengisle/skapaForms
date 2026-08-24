/**
 * Guiden för att skapa ett nytt formulär utifrån flikarna Flervalsfrågor och Kortsvar.
 *
 * Elever identifieras via verifierad e-post (formulärinställningen "Samla in
 * e-postadresser: Verifierad" - eleven måste logga in med sitt Google-konto, och
 * skriver aldrig in e-posten själv) - ingen egen "Namn"-fråga behövs.
 *
 * Rättning av flervalsfrågor sker INTE via kalkylarket. Efter att formuläret skapats
 * svarar läraren på det själv (precis som en elev) - det svaret blir facit som
 * elevernas svar jämförs mot. Se Results.gs för själva rättningen.
 *
 * Kortsvar rättas inte alls - det är öppna frågor. Resultatsidan visar bara om en
 * elev har svarat på formuläret eller inte (svaren går att läsa i svarsfliken).
 */

function showNewFormWizard() {
  const counts = getQuestionCounts();

  const template = HtmlService.createTemplateFromFile('Wizard');
  template.mcCount = counts.mcCount;
  template.saCount = counts.saCount;
  template.mcIncompleteRows = counts.mcIncompleteRows;

  const html = template.evaluate().setWidth(480).setHeight(480);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nytt formulär – guide');
}

/**
 * Anropas både när guiden öppnas och från "🔄 Uppdatera"-knappen i Wizard.html,
 * så att läraren kan fylla i frågor i bakgrunden och uppdatera antalet utan att
 * behöva stänga och öppna om hela guiden (och tappa ett redan ifyllt namn).
 *
 * Skickar även med mcIncompleteRows: radnummer i Flervalsfrågor som har text i
 * Fråga-kolumnen (eller något alternativ) men saknar minst 2 ifyllda alternativ -
 * sådana rader räknas INTE med i mcCount, och utan den här listan är det osynligt
 * för läraren varför en rad "försvinner".
 */
function getQuestionCounts() {
  const ss = SpreadsheetApp.getActive();
  return {
    mcCount: readMultipleChoiceRows(ss.getSheetByName(SHEET_NAMES.MULTIPLE_CHOICE)).length,
    saCount: readShortAnswerRows(ss.getSheetByName(SHEET_NAMES.SHORT_ANSWER)).length,
    mcIncompleteRows: findIncompleteMultipleChoiceRows(ss.getSheetByName(SHEET_NAMES.MULTIPLE_CHOICE))
  };
}

function findIncompleteMultipleChoiceRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  const values = sheet.getRange(3, 1, lastRow - 2, 7).getValues();
  const incompleteRows = [];
  values.forEach(function (v, i) {
    const question = String(v[0]).trim();
    let optionCount = 0;
    for (let j = 0; j < 5; j++) {
      if (String(v[1 + j]).trim() !== '') optionCount++;
    }
    const hasAnyContent = question !== '' || optionCount > 0;
    if (hasAnyContent && optionCount < 2) {
      incompleteRows.push(3 + i); // Faktiskt radnummer i kalkylarket.
    }
  });
  return incompleteRows;
}

/**
 * Anropas från Wizard.html. Bygger formuläret, länkar svaren till detta ark,
 * flyttar formuläret till samma Drive-mapp, loggar i registret och rensar byggflikarna.
 */
function createFormFromWizard(options) {
  const name = (options && options.name || '').trim();
  if (!name) {
    throw new Error('Du måste ange ett namn på formuläret.');
  }

  const ss = SpreadsheetApp.getActive();
  const mcSheet = ss.getSheetByName(SHEET_NAMES.MULTIPLE_CHOICE);
  const saSheet = ss.getSheetByName(SHEET_NAMES.SHORT_ANSWER);
  const mcRows = readMultipleChoiceRows(mcSheet);
  const saRows = readShortAnswerRows(saSheet);

  if (mcRows.length === 0 && saRows.length === 0) {
    throw new Error('Lägg till minst en fråga i "Flervalsfrågor" eller "Kortsvar" innan du skapar formuläret.');
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

  clearWorkingRows(mcSheet, 3);
  clearWorkingRows(saSheet, 3);

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
    mcCount, saCount, 'Nej', '', JSON.stringify(itemsMeta)
  ]);
}

function clearWorkingRows(sheet, startRow) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clearContent();
  }
}

function readMultipleChoiceRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  const values = sheet.getRange(3, 1, lastRow - 2, 7).getValues(); // Fråga, Alternativ 1-5, Poäng
  const rows = [];
  values.forEach(function (v) {
    const question = String(v[0]).trim();

    const options = [];
    for (let i = 0; i < 5; i++) {
      const value = String(v[1 + i]).trim();
      if (value !== '') options.push(value);
    }
    if (options.length < 2) return; // Hoppa över ofullständiga rader.

    const points = Number(v[6]) > 0 ? Number(v[6]) : 1;
    rows.push({ question: question, options: options, points: points });
  });
  return rows;
}

function readShortAnswerRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  const values = sheet.getRange(3, 1, lastRow - 2, 1).getValues(); // Fråga
  const rows = [];
  values.forEach(function (v) {
    const question = String(v[0]).trim();
    if (!question) return; // Kräver minst ett tecken (text eller ett nummer) i Fråga-fältet.
    rows.push({ question: question });
  });
  return rows;
}
