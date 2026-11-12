# Kraft Promille

**Promille- og forbrenningskalkulator** for [ranheimkraft.no](https://ranheimkraft.no).

Regner ut omtrent hvor høy promillen er nå, når den er under 0,2 og når den er helt nede på 0,00, med norske drikke-enheter. Alt regnes ut i nettleseren, og økten lagres bare lokalt (`localStorage`), slik at du kan lukke siden på fest og åpne den igjen senere på kvelden eller morgenen etter.

> **Status:** v0.3.0. Skal ligge på **https://ranheimkraft.no/promille/** (nettsiden henter nye versjoner innen 3 timer etter at den er koblet på).
>
> **Forhåndsvisning:** https://ranheimgeriljatv.github.io/Kraft-Promille/

## Søkeord

Siden skal vinne disse søkene (brukt i tittel, overskrift, beskrivelse og «Spørsmål og svar»):

1. promillekalkulator
2. hvor lenge til jeg er edru
3. regne ut promille
4. når kan jeg kjøre bil etter alkohol
5. 12-timersregelen alkohol

## Funksjoner

### Profil

| Felt        | Styring              | Område / standard  |
| ----------- | -------------------- | ------------------ |
| Kjønn       | Mann / Kvinne        | Mann               |
| Vekt        | Slider og tallfelt   | 40–160 kg, 80 kg   |
| Høyde       | Slider og tallfelt   | 140–210 cm, 180    |
| Alder       | Slider og tallfelt   | 18–90 år, 30 år    |
| Mageinnhold | Tom mage / Spist mat | Opptak 30 / 60 min |

### Norske drikke-enheter

Store hurtigknapper med standardstyrke forhåndsvalgt. Styrke (og størrelse for vin og shot) velges i en nedtrekksliste under knappen.

| Enhet        | Volum                  | Styrker (standard i **fet**)       |
| ------------ | ---------------------- | ---------------------------------- |
| Øl 0,4 l     | 4,0 dl                 | **4,7 %**, 5,5 %, 3,5 %            |
| Øl 0,5 l     | 5,0 dl                 | **4,7 %**, 6,0 %, 7,0 %            |
| Øl 0,6 l     | 6,0 dl                 | **4,7 %**, 5,5 %                   |
| Glass vin    | **1,5 dl**, stort 2 dl | 11,5 %, 12,5 %, **13,5 %**, 14,5 % |
| Drink / dram | 4 cl brennevin         | **37,5 %**, 40 %, 22 %             |
| Shot         | **4 cl**, liten 2 cl   | 20 %, 35 %, **40 %**               |

Enhetene ligger i [`src/data/drinks.js`](src/data/drinks.js).

### To tidsmoduser

- **Logg fortløpende:** hvert trykk legger til enheten med klokkeslettet nå. Enheten regnes som drukket jevnt over en **drikketid**, ikke alt på én gang (se under). Klokkeslettet kan endres på hver linje etterpå (f.eks. 19:30), og linjen kan fjernes. Et klokkeslett flyttes til nærmeste dag, så 23:50 på en enhet registrert 00:10 blir kvelden før.
  - **Standard drikketid** per kategori: øl 0,4 l 30 min, øl 0,5 l 40 min, øl 0,6 l 45 min, glass vin 45 min, drink/dram 20 min og shot 1 min (`defaultMinutes` i [`src/data/drinks.js`](src/data/drinks.js)).
  - **«Ferdig»-knapp** på hver linje: trykk når du har drukket opp, så brukes den faktiske tiden fra start til nå (minst 1 og maks 180 min). Linjen viser «Drikker nå · antas ferdig kl. …» til standardtiden er gått, og «Drukket over … min» når du har trykket. Knappen vises i to timer etter at enheten ble lagt til. Endrer du startklokkeslettet, beholdes drikketiden.
  - Fordelingen gjør at toppen blir lavere og kommer senere enn om hele enheten var drukket på ett tidspunkt. Siste slurk (og dermed 12-timersregelen) regnes fra slutten av siste drikketid.
- **Oppsummer i etterkant:** velg «Startet å drikke kl.» og «Sluttet å drikke kl.» og tell opp antallet av hver enhet. Enhetene fordeles jevnt fra start til slutt (første ved start, siste ved slutt), og typene flettes. Starttiden er siste gang klokka var det klokkeslettet, og sluttiden er første gang etter start, så 19:00–01:30 går over midnatt.
  - **Ny kveld:** Oppsummeringen gjelder én kveld. Morgenen etter vises gårsdagens kveld fortsatt. Når startklokkeslettet har kommet rundt igjen (f.eks. 19:00 neste dag), blir det en ny, tom kveld med samme klokkeslett, også om fanen har stått åpen. En ny kveld (også første gang du åpner siden) slutter aldri senere enn nå, så kl. 23:00 blir 19:00–01:30 til 19:00–23:00.

**Start ny kveld / Tøm liste** tømmer drikkelisten i begge modusene, men beholder profilen. I oppsummeringen flyttes også start og slutt til kvelden nå hvis de er fra en tidligere dag.

### Resultat

1. **Estimert promille nå** med typisk påvirkning og toppunktet i kveld.
2. **Bilkjøring: 0,00 ‰ og 0,2 ‰-grensen** med normal forbrenning (0,15 ‰/t). Kortet forklarer at du kan straffes også under 0,2 ‰ hvis du er påvirket (vurderes etter skjønn og oppførsel), og at bare 0,00 ‰ er trygt.
3. **Grønt lys / Sikker sone** med konservativ forbrenning (0,10 ‰/t) og full opptakstid (60 min). Uthevet som det tryggeste valget.
4. **12-timersregelen** – 12 timer etter siste enhet, sammenlignet med sikker sone, med en advarsel om at regelen ikke er til å stole på (tiden avhenger av mengde, styrke og hvor tett man drikker).
5. **Time for time**: graf over begge kurvene og tabell fra første enhet til begge er på 0,00, med fargekoder: rød (> 0,5), oransje (0,2–0,5), gul (0,01–0,19) og grønn (0,00 på begge).

Alle klokkeslett rundes **opp** til nærmeste 5 minutter. På mobil viser en fast linje nederst promillen nå og når sikker sone (0,00 ‰) nås. På PC (fra 1024 px) er siden et dashbord med to kolonner (maks 1280 px): profil og drikke til venstre (5/12), resultat til høyre (7/12).

## Regnemodellen

Ligger i [`src/utils/bacCalculator.js`](src/utils/bacCalculator.js) og er testet i [`bacCalculator.test.js`](src/utils/bacCalculator.test.js).

1. **Kroppsvæske (Watson):**
   - Mann: `TBW = 2,447 − 0,09156 × alder + 0,1074 × høyde + 0,3362 × vekt`
   - Kvinne: `TBW = −2,097 + 0,1069 × høyde + 0,2466 × vekt` (bruker ikke alder)
2. **Gram alkohol per enhet** med 10 % resorpsjonstap: `volum i dl × prosent × 0,789 × 0,90`.
3. **Promille** = `gram × 0,8 / TBW`. Alkoholen fordeler seg i kroppsvæsken, og blod er ca. 80 % vann. For en mann på 80 kg, 180 cm og 30 år gir dette omtrent det samme som Widmark med r = 0,7.
4. **Drikketid og gradvis opptak:** hver enhet drikkes jevnt over drikketiden (porsjoner à ca. 5 min), og hver porsjon tas opp lineært over 30 min (tom mage) eller 60 min (mat).
5. **Forbrenning fra første slurk**, så lenge promillen er over 0. Kurven simuleres minutt for minutt og samples hvert 15. minutt til grafen. To kurver regnes ut parallelt: normal (0,15 ‰/t) og konservativ (0,10 ‰/t, minst 60 min opptak).

Tallene er anslag. Leverfunksjon, dagsform, medisiner og mat gjør at den faktiske promillen kan avvike mye.

## Ansvarsfraskrivelse og vilkår

Den oransje boksen øverst har en kort ansvarsfraskrivelse og en lenke («Les fullstendige vilkår og ansvarsfraskrivelse») til de fullstendige vilkårene nederst i «Spørsmål og svar» (`#vilkar`). Vilkårene (formål og begrensninger, førerens lovansvar, fraskrivelse av erstatnings- og rettsansvar, aksept) ligger i [`src/data/terms.js`](src/data/terms.js). De er ikke med i FAQPage-dataene, siden de er for lange til å være et spørsmål med svar.

Teksten er ikke vurdert av en jurist.

## Personvern og lagring

- Kalkulatoren gjør ingen API-kall. Fontene (Syne, Plus Jakarta Sans og JetBrains Mono) ligger i bygget via `@fontsource`, så siden henter ingenting fra Google.
- Profil, valgt styrke, modus og kveldens drikkeliste lagres i `localStorage` under nøkkelen `kraft-promille:v1`. Lagret data valideres når siden åpnes, og appen virker også når lagring er blokkert.
- **NB:** På ranheimkraft.no legger synk-skriptet inn Umami, som teller sidevisninger (uten informasjonskapsler og uten det du skriver inn). Derfor sier den lille personvern-linjen at det du skriver inn, lagres bare på enheten din, og ikke at siden ikke sender noe i det hele tatt.

## Utvikling

Krever Node 24.

```bash
npm install
npm run dev        # utviklingsserver
npm test           # Vitest (regnemodell, klokkeslett, app, tilgjengelighet med axe, SEO)
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # bygg til dist/
```

### Filstruktur

```
index.html                         Tittel, meta, Open Graph, JSON-LD og noscript-tekst
src/main.jsx                       Oppstart og fonter
src/App.jsx                        Tilstand, lagring og oppsett av sidene
src/utils/bacCalculator.js         Regnemotoren (Watson, opptak, to forbrenningskurver)
src/utils/evening.js               Enheter/oppsummering → liste med { ts, grams }
src/utils/time.js                  Klokkeslett, avrunding og formatering
src/utils/storage.js               localStorage med feilhåndtering
src/utils/restoreState.js          Validering av lagret økt
src/data/drinks.js                 Norske drikke-enheter
src/data/profile.js                Grenser og standardverdier for profilen
src/data/faq.js                    Spørsmål og svar (må være lik FAQPage i index.html)
src/components/PrivacyAndDisclaimer.jsx  Personvern-banner og ansvarsfraskrivelse
src/components/ProfileInput.jsx          Kjønn, vekt, høyde, alder og mageinnhold
src/components/DrinkLogger.jsx           Hurtigknapper, tidsmoduser og liste
src/components/ResultDashboard.jsx       Fire kort, graf og time-for-time-tabell
src/components/MobileStatusBar.jsx       Fast linje nederst på mobil
```

## Publisering

- Workflowen [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) kjører formatering, lint, tester og bygg på `main`, publiserer forhåndsvisningen på GitHub Pages og pusher `dist/` til grenen `build`.
- ranheimkraft.no henter grenen `build` hver 3. time og kopierer den til `promille/`. Første gang må prosjektet kobles på i nettsidens egen økt (synk-funksjon, meny, kort på forsiden, `sitemap.xml`).
