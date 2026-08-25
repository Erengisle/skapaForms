# Skapa mallen med clasp (alternativ till copy-paste)

Den här guiden är ett alternativ till "Kom igång"-avsnittet i huvud-READMEn.
Den ersätter bara **steg 1–5 där** (att skapa arket och klistra in koden
manuellt i Apps Script-editorn) - allt efter det, t.ex. att dela mallen till
kollegor via **Arkiv > Skapa en kopia**, fungerar exakt likadant oavsett hur
mallen skapades.

`clasp` är Googles officiella CLI för Apps Script och laddar upp filer direkt
från datorn till ett Apps Script-projekt, istället för att du klistrar in dem
för hand i webbläsaren.

> ⚠️ **Kräver att du kan installera program lokalt.** Många skoldatorer (t.ex.
> Chromebooks eller hanterade Windows-datorer) tillåter inte att elever eller
> personal installerar Node.js/npm själva. Har du inte den möjligheten - eller
> är osäker - använd copy-paste-metoden i huvud-READMEn istället. Den kräver
> ingenting utöver en webbläsare.

## Förutsättningar

- [Node.js](https://nodejs.org) installerat (clasp är ett npm-paket).
- Ett Google-konto med Apps Script aktiverat.

## 1. Installera clasp

```bash
npm install -g @google/clasp
```

## 2. Logga in

```bash
clasp login
```

Öppnar en webbläsare där du loggar in med samma Google-konto som ska äga
mallen. Måste bara göras en gång per dator.

Om det är första gången du använder Apps Script API på kontot: gå till
[script.google.com/home/usersettings](https://script.google.com/home/usersettings)
och slå på **"Google Apps Script API"** - annars nekar `clasp push` senare.

## 3. Skapa ett nytt Sheets-bundet projekt

Kör i en tom mapp (inte i skapaForms-repot direkt - se steg 4):

```bash
mkdir skapa-formular-mall && cd skapa-formular-mall
clasp create --type sheets --title "Skapa Formulär - mall"
```

Det här skapar **både** ett nytt Google Kalkylark och ett bundet Apps
Script-projekt i ett enda steg - du slipper skapa arket manuellt i
webbläsaren. `clasp create` lägger dit en `.clasp.json` (pekar på projektet)
och en tom `appsscript.json` + `Code.gs`.

## 4. Kopiera in filerna från repot

Kopiera dessa filer från skapaForms-repot till samma mapp, och skriv över
den tomma `Code.gs`:

```bash
cp /sökväg/till/skapaForms/Code.gs .
cp /sökväg/till/skapaForms/SheetSetup.gs .
cp /sökväg/till/skapaForms/FormBuilder.gs .
cp /sökväg/till/skapaForms/Results.gs .
cp /sökväg/till/skapaForms/Mailer.gs .
cp /sökväg/till/skapaForms/Wizard.html .
cp /sökväg/till/skapaForms/appsscript.json .
```

(`appsscript.json` skrivs också över - den genererade varianten duger inte,
repots version har rätt inställningar.)

## 5. Push till Google

```bash
clasp push
```

Laddar upp alla filer till Apps Script-projektet. Säger den att den vill
skriva över `appsscript.json`, svara ja.

## 6. Öppna och godkänn behörigheter

```bash
clasp open --sheet
```

Öppnar kalkylarket i webbläsaren. Ladda om sidan, klicka på
**"Skapa Formulär"**-menyn och godkänn de behörigheter Google frågar efter
(Forms, Kalkylark, Drive) - precis som i den vanliga guiden i README.

## Framtida uppdateringar

Ändrar du koden i git-repot senare och vill uppdatera mallen:

```bash
cd skapa-formular-mall
cp /sökväg/till/skapaForms/*.gs /sökväg/till/skapaForms/*.html /sökväg/till/skapaForms/appsscript.json .
clasp push
```

**Notera:** det här gör bara *skapandet av mallen* snabbare. Spridningen
till kollegor sker fortfarande genom att de gör **Arkiv > Skapa en kopia**
på kalkylarket, precis som idag - det påverkas inte av om mallen byggdes
med clasp eller copy-paste.
