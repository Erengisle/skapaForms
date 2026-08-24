# Skapa Formulär

Ett Google Apps Script-verktyg som gör det enkelt för lärare (utan kodvana) att
skapa Google Forms direkt från ett kalkylark, samla svaren på ett ställe och få
en sammanställning av elevernas poäng.

## Kom igång (görs en gång)

1. Skapa ett nytt Google-kalkylark (eller använd ett befintligt som ska bli mallen).
2. Öppna **Tillägg (Extensions) > Apps Script**.
3. Visa manifestfilen (den finns redan dold i varje nytt projekt - skapa **inte**
   en ny fil för den, det ger felet "det finns redan en fil med det namnet"):
   1. Klicka på kugghjulet ⚙️ **"Projektinställningar"** i vänstermenyn.
   2. Bocka i **"Visa filen 'appsscript.json' i redigeraren"** (manifest-inställningen).
   3. Gå tillbaka till filvyn (`</>`-ikonen) - `appsscript.json` syns nu i filistan.
   4. Öppna den, markera och radera allt innehåll, och klistra in innehållet från
      `appsscript.json` i det här repot.
4. Ta bort eventuell standardkod i `Code.gs` och skapa sedan resten av filerna i
   Apps Script-editorn, med exakt samma innehåll som filerna i det här repot:
   - `Code.gs`
   - `SheetSetup.gs`
   - `FormBuilder.gs`
   - `Results.gs`
   - `Wizard.html` (skapa som en HTML-fil, inte .gs)
5. Spara projektet och ladda om kalkylarket i webbläsaren.
6. En ny meny **"Skapa Formulär"** dyker upp. Klicka på valfritt menyval för att
   godkänna de behörigheter Google frågar efter (Forms, Kalkylark, Drive) - detta
   sker en gång per person som använder arket.
7. Klart! Arket har nu flikarna **Flervalsfrågor**, **Kortsvar** och **📊 Resultat**
   (samt en dold flik **Formulärregister**).

> **Alternativ:** Använder du `clasp` (Googles CLI för Apps Script) kan du
> slippa klistra in filerna för hand - se [docs/clasp-guide.md](docs/clasp-guide.md).

## Så använder en lärare mallen

1. Fyll i frågor i flikarna **Flervalsfrågor** och/eller **Kortsvar** - en rad per
   fråga. Skriv frågan i klartext i "Fråga"-kolumnen, eller bara ett nummer
   (t.ex. `3`) om eleverna redan har frågetexten på annat håll (t.ex. ett papper) -
   frågan får då rubriken "Fråga 3" i formuläret. På flervalsfrågor anger du gärna
   en **Poäng** per fråga (annars räknas frågan som 1 poäng värd). Rätt svar anges
   **inte** i arket.
2. Öppna **Skapa Formulär > Nytt formulär (guide)** i menyn, namnge formuläret och
   kontrollera att antalet frågor stämmer.
3. Formuläret skapas automatiskt i samma Drive-mapp som kalkylarket, och svaren
   länkas till en ny flik i samma ark ("Svar - [formulärnamn]"). Eleverna
   identifieras via sin **verifierade e-post** (Forms samlar in den automatiskt
   när eleven svarar inloggad) - ingen namnfråga behövs.
4. **Viktigt, bara om formuläret har flervalsfrågor:** Öppna formuläret och svara på
   det själv, precis som en elev, med **samma Google-konto** som skapade formuläret.
   Ditt svar blir facit som elevernas svar på flervalsfrågorna rättas mot. Svarar du
   fel av misstag går det bra att svara om; senaste svaret från dig gäller. Kortsvar
   behöver du inte svara på - de rättas inte.
5. När som helst: klicka **Skapa Formulär > Uppdatera resultatsidan** för att bygga
   om **📊 Resultat** - en rad per elev, en kolumn per formulär, med aktuella poäng.
   Facit för flervalsfrågor hämtas automatiskt från ditt eget svar varje gång sidan
   uppdateras. Har du inte svarat på ett formulär med flervalsfrågor än visas
   "Väntar på facit" istället för poäng.

### Hur rättningen fungerar

- **Flervalsfrågor:** elevens svar jämförs mot ditt (lärarens) svar på samma fråga -
  **exakt textmatchning**, oberoende av stor/liten bokstav och mellanslag i
  början/slutet. Poängen hämtas från "Poäng"-kolumnen i arket vid formulärskapandet
  (1 poäng om inget anges).
- **Kortsvar rättas inte alls.** De är öppna frågor - svaren går att läsa i
  formulärets svarsflik. Ett formulär som bara innehåller kortsvar (inga
  flervalsfrågor) visar istället "✓" i Resultat för varje elev som svarat, så du ser
  vilka som svarat eller inte.
- Ditt eget svar räknas aldrig med som en elev i resultatsammanställningen.
- Formulärregistret (dold flik) visar per formulär om facit har hittats ("Facit
  hämtat") och när - eller "Ej tillämpligt" för formulär utan flervalsfrågor.

### Färgkodning i Resultat

Poängceller färgas efter andel rätt: **röd** <50 %, **gul** 50-74 %, **grön** ≥75 %.
Samma färgskala används i två tabeller:

- **Elevtabellen** (överst) - varje elevs poäng per formulär, för att snabbt se vilka
  elever som ligger lågt. Formulär utan flervalsfrågor visar "✓" istället för poäng
  och färgas inte.
- **Frågeanalysen** (under elevtabellen) - andel rätt per enskild flervalsfråga,
  summerat över hela klassen, för att se vilka frågor som är extra svåra. Kortsvar
  ingår inte här eftersom de inte rättas.

## Dela mallen till kollegor

Låt kollegan göra **Arkiv (File) > Skapa en kopia** på mallarket. Kopian får en
egen tom start (inga gamla formulär i registret) men samma script, meny och flikar.

## Kända begränsningar

- **Elevidentifiering** kräver att eleven svarar inloggad i sitt Google-konto, så att
  e-posten blir verifierad (`setCollectEmail`). Om ett formulär delas öppet utanför
  skolans domän kan e-postadressen inte verifieras.
- **Facit för flervalsfrågor kräver att läraren svarar själv.** Tills dess visas
  "Väntar på facit" och inga poäng räknas ut. Facit hämtas genom att hitta det svar
  som kommit in från samma Google-konto som skapade formuläret - svarar läraren från
  ett annat konto räknas det inte som facit.
- **Kortsvar poängsätts inte.** De är öppna frågor - svaren går att läsa i
  formulärets svarsflik i kalkylarket. Resultatsidan visar bara om eleven har
  svarat på formuläret eller inte, inte om svaret är "rätt".
- **Mappval** är förenklat: formuläret sparas alltid i samma Drive-mapp som
  kalkylarket (en fullständig mappväljare kräver ett eget Google Cloud-projekt med
  Picker API, vilket bryter mot målet att mallen ska fungera direkt när den kopieras).
- **En kopia av mallen per klass.** Det finns inget stöd för flera klasser i samma ark.

## Uppgraderar du en mall som redan testats?

Kolumnerna i flikarna har ändrats (facit anges inte längre i arket - se ovan). Om du
redan har flikar från en tidigare version:

1. **Flervalsfrågor:** ta bort kolumnen "Rätt alternativ (1-5)" om den finns kvar.
2. **Kortsvar:** ta bort kolumnen "Poäng" om den finns kvar - kortsvar ska bara ha
   kolumnen "Fråga".
3. **Formulärregister:** visa fliken (**Skapa Formulär > Visa formulärregister**),
   radera den, och kör sedan **Skapa Formulär > Kontrollera/reparera mallen** för att
   skapa den på nytt med rätt kolumner. Den innehåller bara loggdata, inget som
   behöver sparas under test. Formulär som skapades före uppgraderingen känns inte
   igen av den nya resultatsidan - skapa i så fall om dem.
