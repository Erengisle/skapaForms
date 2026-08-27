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
   - `Mailer.gs`
   - `Wizard.html` (skapa som en HTML-fil, inte .gs)
5. Spara projektet och ladda om kalkylarket i webbläsaren.
6. En ny meny **"Skapa Formulär"** dyker upp. Klicka på valfritt menyval för att
   godkänna de behörigheter Google frågar efter (Forms, Kalkylark, Drive, Mejl) -
   detta sker en gång per person som använder arket.
7. Klart! Arket har nu flikarna **Frågor** och **📊 Resultat** (samt en dold flik
   **Formulärregister**).

> **Alternativ:** Använder du `clasp` (Googles CLI för Apps Script) kan du
> slippa klistra in filerna för hand - se [docs/clasp-guide.md](docs/clasp-guide.md).

## Så använder en lärare mallen

Arbetsgången är fyra steg: **skriv frågor → välj typ → skapa formuläret → svara
själv (facit)**.

1. Skriv frågor i fliken **Frågor** - en rad per fråga. Skriv frågan i klartext i
   "Fråga"-kolumnen, eller bara ett nummer (t.ex. `3`) om eleverna redan har
   frågetexten på annat håll (t.ex. ett papper) - frågan får då rubriken "Fråga 3"
   i formuläret.
2. Välj **Typ** för varje rad i dropdown-listan: **Flerval** (fyll då även i minst
   2 av kolumnerna Alternativ 1-5 - varje flervalsfråga är värd 1 poäng) eller
   **Kortsvar** (öppen fråga, inga alternativ behövs). Rätt svar anges **inte** i
   arket för flervalsfrågor - det görs i steg 4.
3. Öppna **Skapa Formulär > Nytt formulär (guide)** i menyn. Guiden visar direkt
   hur många frågor av varje typ som hittats - stämmer inte antalet, eller varnar
   guiden för ofullständiga rader, gå till fliken, rätta till och klicka
   "🔄 Uppdatera" i guiden (du behöver inte stänga den). Namnge sedan formuläret
   och klicka "Skapa formulär". Formuläret skapas automatiskt i samma Drive-mapp
   som kalkylarket, och svaren länkas till en ny flik i samma ark
   ("Svar - [formulärnamn]"). Formuläret ställs in på **Samla in e-postadresser:
   Verifierad** - eleven måste logga in med sitt Google-konto för att svara, och
   e-posten hämtas då automatiskt utan att eleven skriver in den själv.
4. **Viktigt, bara om formuläret har flervalsfrågor:** Öppna formuläret och svara
   på det själv, precis som en elev, med **samma Google-konto** som skapade
   formuläret. Ditt svar blir facit som elevernas svar på flervalsfrågorna rättas
   mot. Svarar du fel av misstag går det bra att svara om; senaste svaret från dig
   gäller. Kortsvar behöver du inte svara på - de rättas inte.

Därefter, när som helst:

- Klicka **Skapa Formulär > Uppdatera resultatsidan** för att bygga om
  **📊 Resultat** - en rad per elev, en kolumn per formulär, med aktuella poäng
  (klassvis översikt) och en frågeanalys som visar vilka frågor klassen tyckte var
  svårast. Facit för flervalsfrågor hämtas automatiskt från ditt eget svar varje
  gång sidan uppdateras. Har du inte svarat på ett formulär med flervalsfrågor än
  visas "Väntar på facit" istället för poäng.
- **Eleven får automatiskt ett mejl med sitt resultat** på flervalsfrågorna, så
  fort facit finns - se "Automatiska resultatmejl" nedan.

### Automatiska resultatmejl

Så fort en elev har svarat på ett formulär MED flervalsfrågor, och facit redan
finns (du har själv svarat), skickar scriptet automatiskt ett mejl till eleven med
poängen. Mejlet är formaterat (HTML) med en färgkodad resultatruta i samma
röd/gul/grön-skala som 📊 Resultat-fliken - vill du ändra utseendet gör du det i
`sendResultEmail()` i `Mailer.gs`. Ordningen spelar ingen roll:

- Svarar eleven **efter** att du har svarat: mejlet skickas direkt.
- Svarar eleven **innan** du har svarat: inget mejl skickas då, men så fort du
  sedan svarar (och facit finns) mejlas alla elever som redan svarat och väntar.

Varje elevsvar mejlas bara **en gång** - rättar du ditt facit-svar i efterhand
skickas inga nya mejl till elever som redan fått ett. Formulär som bara har
kortsvar (inga flervalsfrågor) skickar inget mejl, eftersom de inte rättas och
det inte finns något resultat att rapportera.

### Hur rättningen fungerar

- **Flervalsfrågor:** elevens svar jämförs mot ditt (lärarens) svar på samma fråga -
  **exakt textmatchning**, oberoende av stor/liten bokstav och mellanslag i
  början/slutet. Varje flervalsfråga är värd 1 poäng.
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

- **Elevtabellen** (överst) - varje elevs poäng per formulär (individuellt), för
  att snabbt se vilka elever som ligger lågt. Formulär utan flervalsfrågor visar
  "✓" istället för poäng och färgas inte. Sist på raden finns en **Snitt**-kolumn
  med elevens genomsnittliga procent över alla poängsatta formulär (kortsvars-
  formulär räknas inte in), så du ser helhetsbilden utan att läsa hela raden.
- **Frågeanalysen** (under elevtabellen) - andel rätt per enskild flervalsfråga,
  summerat över hela klassen (klassvis), för att se vilka frågor som är extra
  svåra. Kortsvar ingår inte här eftersom de inte rättas.

## Dela mallen till kollegor

Låt kollegan göra **Arkiv (File) > Skapa en kopia** på mallarket. Kopian får en
egen tom start (inga gamla formulär i registret) men samma script, meny och flikar.

## Kända begränsningar

- **Elevidentifiering** kräver att eleven svarar inloggad i sitt Google-konto
  (formulärinställningen "Samla in e-postadresser: Verifierad",
  `setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED)`). Om ett formulär
  delas öppet utanför skolans domän kan e-postadressen inte verifieras.
- **Facit för flervalsfrågor kräver att läraren svarar själv.** Tills dess visas
  "Väntar på facit" och inga poäng räknas ut, och inga resultatmejl skickas.
  Facit hämtas genom att hitta det svar som kommit in från samma Google-konto som
  skapade formuläret - svarar läraren från ett annat konto räknas det inte som facit.
- **Kortsvar poängsätts inte.** De är öppna frågor - svaren går att läsa i
  formulärets svarsflik i kalkylarket. Resultatsidan visar bara om eleven har
  svarat på formuläret eller inte, inte om svaret är "rätt".
- **Resultatmejl skickas bara en gång per elevsvar.** Rättar du ditt facit-svar
  efter att mejl redan skickats ut går inga nya mejl till de elever som redan
  fått ett - de behöver då få rättningen muntligt eller via resultatsidan.
- **Mejlkvot:** `MailApp` har en daglig kvot (cirka 100 mejl/dygn för vanliga
  Google-konton, betydligt högre för skolkonton via Google Workspace). En enskild
  klass ryms normalt gott och väl inom kvoten.
- **Mappval** är förenklat: formuläret sparas alltid i samma Drive-mapp som
  kalkylarket (en fullständig mappväljare kräver ett eget Google Cloud-projekt med
  Picker API, vilket bryter mot målet att mallen ska fungera direkt när den kopieras).
- **En kopia av mallen per klass.** Det finns inget stöd för flera klasser i samma ark.

## Uppgraderar du en mall som redan testats?

Flikstrukturen har ändrats - flikarna **Flervalsfrågor** och **Kortsvar** är
ersatta av en enda flik **Frågor** med en Typ-kolumn. Om du redan har en äldre
version av mallen:

1. Kör **Skapa Formulär > Kontrollera/reparera mallen** - det skapar den nya
   fliken **Frågor** (de gamla flikarna påverkas inte och kan tas bort manuellt
   när du inte längre behöver dem).
2. Har du oskapade frågor kvar i de gamla flikarna: kopiera över dem rad för rad
   till **Frågor** och välj Typ (Flerval/Kortsvar) för varje rad.
3. Har du redan en **Frågor**-flik från innan Poäng-kolumnen togs bort: radera
   fliken (högerklicka på flikfliken > Radera) och kör
   **Skapa Formulär > Kontrollera/reparera mallen** igen för att skapa den på nytt
   utan den kolumnen. Alla flervalsfrågor är numera alltid värda 1 poäng.
4. **Formulärregister:** visa fliken (**Skapa Formulär > Visa formulärregister**),
   radera den, och kör sedan **Skapa Formulär > Kontrollera/reparera mallen** för att
   skapa den på nytt med rätt kolumner (bl.a. den nya kolumnen för resultatmejl).
   Den innehåller bara loggdata, inget som behöver sparas under test. Formulär som
   skapades före uppgraderingen känns inte igen av den nya resultatsidan eller av
   resultatmejlen - skapa i så fall om dem.
