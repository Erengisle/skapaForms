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
   - `Facit.gs`
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
   Ange poäng på de frågor som ska rättas automatiskt.
2. Öppna **Skapa Formulär > Nytt formulär (guide)** i menyn och följ stegen: namnge
   formuläret, kontrollera antal frågor, och (om det finns kortsvar) ange din egen
   e-postadress - den används för att känna igen ditt facit-svar i steg 4.
3. Formuläret skapas automatiskt i samma Drive-mapp som kalkylarket, och svaren
   länkas till en ny flik i samma ark ("Svar - [formulärnamn]"). Eleverna
   identifieras via sin **verifierade e-post** (Forms samlar in den automatiskt
   när eleven svarar inloggad) - ingen namnfråga behövs.
4. Flervalsfrågor med angivet rätt alternativ rättas automatiskt av Google Forms.
   Har du kortsvar: **svara på formuläret själv** direkt efter att det skapats
   (t.ex. via länken i guidens bekräftelseruta) - ditt svar blir facit.
5. När som helst: klicka **Skapa Formulär > Uppdatera resultatsidan**. Det gör två
   saker i tur och ordning:
   - Hämtar facit automatiskt för alla formulär där du svarat men facit ännu
     inte hämtats (matchas via din e-post från steg 2).
   - Bygger om **📊 Resultat** - en rad per elev, en kolumn per formulär, med
     aktuella poäng.

### Färgkodning i Resultat

Poängceller färgas efter andel rätt: **röd** <50 %, **gul** 50-74 %, **grön** ≥75 %.
Samma färgskala används i två tabeller:

- **Elevtabellen** (överst) - varje elevs poäng per formulär, för att snabbt se vilka
  elever som ligger lågt.
- **Frågeanalysen** (under elevtabellen) - andel rätt per enskild fråga, summerat över
  hela klassen, för att se vilka frågor som är extra svåra. Endast poängsatta frågor
  visas här: flervalsfrågor med rätt svar, samt kortsvar med poäng vars facit redan
  hämtats. Ograderade frågor saknar ett rätt/fel-facit och tas inte med.

## Dela mallen till kollegor

Låt kollegan göra **Arkiv (File) > Skapa en kopia** på mallarket. Kopian får en
egen tom start (inga gamla formulär i registret) men samma script, meny och flikar.

## Kända begränsningar

- **Elevidentifiering** kräver att eleven svarar inloggad i sitt Google-konto, så att
  e-posten blir verifierad (`setCollectEmail`). Om ett formulär delas öppet utanför
  skolans domän kan e-postadressen inte verifieras.
- **Facit för kortsvar** kräver att läraren kommer ihåg att svara på formuläret
  själv innan resultaten ska räknas ut. Rättningen bygger på exakt textmatchning
  (skiftlägesokänslig) mot lärarens svar - en elevs stavfel/synonym räknas fortfarande
  som fel, precis som facit skrivet i förväg hade gjort.
- **Mappval** är förenklat: formuläret sparas alltid i samma Drive-mapp som
  kalkylarket (en fullständig mappväljare kräver ett eget Google Cloud-projekt med
  Picker API, vilket bryter mot målet att mallen ska fungera direkt när den kopieras).

## Uppgraderar du en mall som redan testats?

Formulärregistret bytte struktur (nya kolumner för e-postbaserad facit-hantering).
Om du redan har en flik **Formulärregister** från en tidigare version: visa den
(**Skapa Formulär > Visa formulärregister**), radera fliken, och kör sedan
**Skapa Formulär > Kontrollera/reparera mallen** för att skapa den på nytt med
rätt kolumner. Den innehåller bara loggdata, inget som behöver sparas under test.
