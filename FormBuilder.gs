/**
 * Guiden för att skapa ett nytt formulär utifrån flikarna Flervalsfrågor och Kortsvar.
 *
 * Elever identifieras via verifierad e-post (Forms samlar in e-post automatiskt när
 * eleven är inloggad i skolans Google-konto) - ingen egen "Namn"-fråga behövs.
 *
 * Flervalsfrågor rättas via Google Forms inbyggda quiz-läge (rätt alternativ anges
 * i kalkylarket). Kortsvar rättas istället genom att LÄRAREN själv svarar på
 * formuläret direkt efter att det skapats - det svaret blir facit (se Facit.gs).
 */

function showNewFormWizard() {
  const ss = SpreadsheetApp.getActive();
  const mcCount = readMultipleChoiceRows(ss.getSheetByName(SHEET_NAMES.MULTIPLE_CHOICE)).length;
  const saCount = readShortAnswerRows(ss.getSheetByName(SHEET_NAMES.SHORT_ANSWER)).length;

  const template = HtmlService.createTemplateFromFile('Wizard');
  template.mcCount = mcCount;
  template.saCount = saCount;
  template.teacherEmail = Session.getActiveUser().getEmail();

  const html = template.evaluate().setWidth(480).setHeight(saCount > 0 ? 540 : 380);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nytt formulär – guide');
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

  const teacherEmail = (options && options.teacherEmail || '').trim();
  if (saRows.length > 0 && (!teacherEmail || teacherEmail.indexOf('@') === -1)) {
    throw new Error('Ange en giltig e-postadress för dig själv - den används för att hämta facit till kortsvarsfrågorna.');
  }

  const isQuiz = mcRows.some(function (r) { return r.isGraded; });

  const form = FormApp.create(name);
  form.setIsQuiz(isQuiz);
  form.setCollectEmail(true); // Verifierad e-post = elevens identitet, ingen namnfråga behövs.

  mcRows.forEach(function (row) { addMultipleChoiceItem(form, row); });
  saRows.forEach(function (row) { addShortAnswerItem(form, row); });

  const responseSheetName = linkFormToSpreadsheet(form, ss, name);
  moveFormToSpreadsheetFolder(form, ss);
  logFormInRegister(ss, form, name, responseSheetName, isQuiz, mcRows.length, saRows.length, teacherEmail, saRows);

  clearWorkingRows(mcSheet, 3);
  clearWorkingRows(saSheet, 3);

  return {
    editUrl: form.getEditUrl(),
    publishUrl: form.getPublishedUrl(),
    responseSheetName: responseSheetName,
    needsFacit: saRows.length > 0
  };
}

function addMultipleChoiceItem(form, row) {
  const item = form.addMultipleChoiceItem();
  item.setTitle(row.question).setRequired(true);
  const choices = row.options.map(function (opt) {
    return item.createChoice(opt.value, row.isGraded && opt.column === row.correctColumn);
  });
  item.setChoices(choices);
  if (row.isGraded) {
    item.setPoints(row.points);
  }
}

function addShortAnswerItem(form, row) {
  // Inga poäng sätts på själva Forms-frågan - kortsvar rättas av vårt eget script
  // genom att jämföra elevens svar med lärarens facit-svar (se Facit.gs).
  form.addTextItem().setTitle(row.question).setRequired(false);
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

/**
 * Loggar formuläret i registret. Kortsvarens facit sparas som JSON med
 * {title, points, correctAnswer:null} - correctAnswer fylls i senare av
 * collectPendingFacits() i Facit.gs när läraren har svarat på formuläret.
 */
function logFormInRegister(ss, form, name, responseSheetName, isQuiz, mcCount, saCount, teacherEmail, saRows) {
  const sheet = ss.getSheetByName(SHEET_NAMES.REGISTER);
  const facitEntries = saRows.map(function (r) {
    return { title: r.question, points: r.points, correctAnswer: null };
  });
  const status = saCount === 0 ? 'Inga kortsvar' : 'Väntar på lärarens svar';

  sheet.appendRow([
    form.getId(), name, new Date(), Session.getActiveUser().getEmail(),
    form.getEditUrl(), form.getPublishedUrl(), responseSheetName,
    isQuiz ? 'Ja' : 'Nej', mcCount, saCount,
    teacherEmail, status, JSON.stringify(facitEntries)
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
  const values = sheet.getRange(3, 1, lastRow - 2, 8).getValues();
  const rows = [];
  values.forEach(function (v) {
    const question = String(v[0]).trim();
    if (!question) return;

    // Alternativens kolumnnummer (1-5) bevaras även om ett alternativ mitt i är tomt,
    // så att "Rätt alternativ"-numret alltid pekar på rätt kolumn.
    const options = [];
    for (let i = 0; i < 5; i++) {
      const value = String(v[1 + i]).trim();
      if (value !== '') options.push({ value: value, column: i + 1 });
    }
    if (options.length < 2) return; // Hoppa över ofullständiga rader.

    const correctColumn = Number(v[6]) || 0;
    const points = Number(v[7]) || 0;
    const hasValidAnswerKey = options.some(function (o) { return o.column === correctColumn; });

    rows.push({
      question: question,
      options: options,
      correctColumn: correctColumn,
      points: points,
      isGraded: hasValidAnswerKey && points > 0
    });
  });
  return rows;
}

function readShortAnswerRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  const values = sheet.getRange(3, 1, lastRow - 2, 2).getValues();
  const rows = [];
  values.forEach(function (v) {
    const question = String(v[0]).trim();
    if (!question) return;
    rows.push({
      question: question,
      points: Number(v[1]) || 0
    });
  });
  return rows;
}
