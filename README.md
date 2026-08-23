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

## Så använder en lärare mallen

1. Fyll i frågor i flikarna **Flervalsfrågor** och/eller **Kortsvar** - en rad per fråga.
2. Öppna **Skapa Formulär > Nytt formulär (guide)** i menyn och följ de tre stegen:
   namnge formuläret, kontrollera antal frågor, och (om det finns kortsvar) välj
   om de ska poängsättas.
3. Formuläret skapas automatiskt i samma Drive-mapp som kalkylarket, och svaren
   länkas till en ny flik i samma ark ("Svar - [formulärnamn]").
4. Flervalsfrågor med angivet rätt alternativ rättas automatiskt av Google Forms.
5. Poängsatta kortsvar rättar läraren snabbt själv i formulärets egen **Svar**-flik
   i Google Forms (Google Forms rättar inte fritext automatiskt). Det facit som
   skrevs in i kalkylarket sparas i den dolda fliken **Formulärregister** som stöd.
6. När som helst: klicka **Skapa Formulär > Uppdatera resultatsidan** för att bygga
   om **📊 Resultat** - en rad per elev, en kolumn per formulär, med aktuella poäng
   (inklusive sådant som rättats manuellt sedan sist).

### Färgkodning i Resultat

Poängceller färgas efter andel rätt: **röd** <50 %, **gul** 50-74 %, **grön** ≥75 %.
Samma färgskala används i två tabeller:

- **Elevtabellen** (överst) - varje elevs poäng per formulär, för att snabbt se vilka
  elever som ligger lågt.
- **Frågeanalysen** (under elevtabellen) - andel rätt per enskild fråga, summerat över
  hela klassen, för att se vilka frågor som är extra svåra. Endast poängsatta frågor
  (flervalsfrågor med rätt svar, samt kortsvar du valt att poängsätta och rättat) visas
  här, eftersom ograderade frågor saknar ett rätt/fel-facit.

## Dela mallen till kollegor

Låt kollegan göra **Arkiv (File) > Skapa en kopia** på mallarket. Kopian får en
egen tom start (inga gamla formulär i registret) men samma script, meny och flikar.

## Kända begränsningar

- **Elevidentifiering** bygger på att eleven skriver sitt namn i den obligatoriska
  "Namn"-frågan på samma sätt varje gång. Stavas namnet olika mellan formulär räknas
  det som två olika elever i sammanställningen.
- **Mappval** är förenklat: formuläret sparas alltid i samma Drive-mapp som
  kalkylarket (en fullständig mappväljare kräver ett eget Google Cloud-projekt med
  Picker API, vilket bryter mot målet att mallen ska fungera direkt när den kopieras).
- **Kortsvar rättas manuellt** i Google Forms - detta är en medveten avvägning
  eftersom exakt-matchning av fritextsvar är opålitlig (stavfel, synonymer m.m.).
