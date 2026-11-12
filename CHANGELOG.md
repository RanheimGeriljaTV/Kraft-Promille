# Endringslogg

Alle viktige endringer i dette prosjektet dokumenteres i denne filen.

Formatet er basert på [Keep a Changelog](https://keepachangelog.com/no/1.0.0/),
og prosjektet følger [Semantic Versioning](https://semver.org/lang/no/).

## [Unreleased]

## [0.4.0] - 2026-11-12

Modell og ordbruk etter kodegjennomgangen og QA-runden (issues #1 og #2).

### Endret

- **Forsiktig kurve** (tidligere «Sikker sone»): ingen resorpsjonstap, det laveste av Watson og Widmark-tilsvarende kroppsvæske, 0,10 ‰/t og 60 min opptak. Før kunne den vise 0,00 ‰ 2–3 timer tidligere enn Widmark med 0,10 ‰/t for slanke og høye personer og små kvinner (#1 H2, #2 Q2).
- **Tak på effektiv r** i normalkurven (0,8). Før kunne Watson alene gi r over 1 ved ytterpunkter som er lov å skrive inn, for eksempel 40 kg og 210 cm.
- **Ordbruk** (#1 H3): «Grønt lys / Sikker sone» heter nå «Forsiktig anslag for 0,00 ‰», «er du da på 0,00 ‰» er «sannsynligvis nede på 0,00 ‰», «Aldri over 0,2 ‰» er «Anslått under 0,2 ‰» og «Nådd» er «Anslag nådd». Teksten sier også at det fortsatt er et estimat.
- Den faste linjen på mobil har en lenke («vilkår») til de fullstendige vilkårene.
- «Spørsmål og svar» og de strukturerte dataene (FAQPage) bruker de nye navnene.
- README er rettet: påstanden om at modellen gir omtrent det samme som Widmark gjaldt bare for en gjennomsnittlig mann, og tidspunktene, ikke toppen.

### Rettet

- Alderleddet i Watsons formel for menn er 0,09516 (var 0,09156, en vanlig tastefeil, se Watson et al. 1980). Utslaget er under 1 % (#1 L1).

### Lagt til

- Tester mot en uavhengig Widmark-beregning (seks profiler fra QA-tabellen), en håndregnet kontroll (56 g på 80 kg mann gir 1,0 ‰ og 10 timer), egenskapstester for taket på r og ordbrukstester (#1 M4).

## [0.3.1] - 2026-11-12

Retter feil fra kodegjennomgangen og QA-runden (issues #1 og #2) som kunne gi et for tidlig klokkeslett.

### Rettet

- «Start ny kveld» og en tom, gammel oppsummering bruker nå i kveld som start og slutt. Før ble nye enheter lagt på gårsdagens dato, og appen viste 0,00 ‰ og «Nådd» etter fire halvlitere (#1 H1, #2 Q1).
- Sommertid: klokkeslett hoppet en time natten klokka stilles. Dager flyttes nå i kalenderen i stedet for med 24 timer (#1 M1, #2 Q3).
- Enheter med klokkeslett frem i tid vises som «Planlagt» i stedet for «Drikker nå» (#1 M2, #2 Q4).
- Promillen rundes opp til to desimaler, og nivå, tekst og «over 0,2 ‰» bruker tallet som vises. Før kunne «0,20 ‰» stå ved siden av «Aldri over 0,2 ‰» (#1 M3, #2 Q5).

### Lagt til

- Dag («i går», «i morgen») i feltene for start og slutt og i listen over enheter (#1 L2).
- Melding med «Start ny kveld» når det registrerte er over 18 timer gammelt.
- Egen rad for toppunktet i tabellen time for time (#1 L3).
- Tester for ny kveld neste dag, sommertid (tidssone Europe/Oslo), planlagte enheter, avrunding og toppunktrad.

## [0.3.0] - 2026-11-11

### Lagt til

- Drikketid i fortløpende modus: hver enhet regnes som drukket jevnt over en standardtid per kategori (øl 30–45 min, vin 45 min, drink 20 min, shot 1 min) i stedet for alt på ett tidspunkt.
- «Ferdig»-knapp på hver registrerte enhet som setter den faktiske drikketiden. Linjen viser «Drikker nå», «Drukket over … min» eller «Antatt drukket over … min».

### Endret

- Siste slurk, og dermed 12-timersregelen, regnes fra slutten av siste drikketid.
- Lagrede enheter får feltet `durationMin`. Eldre lagrede økter fungerer som før, med standard drikketid.

## [0.2.0] - 2026-11-11

### Lagt til

- Fullstendig ansvarsfraskrivelse og vilkår for bruk nederst i «Spørsmål og svar», med lenke fra den oransje boksen øverst.

### Endret

- Svarene om hvordan promillen regnes ut, hvor lenge det tar å bli edru og når man kan kjøre bil, er skrevet om i tråd med vilkårene: grovt teoretisk estimat, og bare blodprøve eller politiets instrument gjelder.

## [0.1.4] - 2026-11-11

### Endret

- Ansvarsfraskrivelsen er byttet ut med en juridisk formulering: uforpliktende og teoretisk hjelpemiddel, ingen garanti for nøyaktighet, intet erstatningsrettslig eller juridisk ansvar, og henvisning til vegtrafikkloven § 22 om førerens selvstendige ansvar.

## [0.1.3] - 2026-11-11

### Lagt til

- Ansvarsfraskrivelsen fra Ranheim Kraft: ingen ansvar for bruken av kalkulatoren, bruk på eget ansvar, og det er juridisk umulig å skylde på kalkulatoren.

## [0.1.2] - 2026-11-11

### Endret

- Kortet for bilkjøring heter nå «Bilkjøring: 0,00 ‰ og 0,2 ‰-grensen», viser 0,00 ‰ først og forklarer at du kan straffes også under 0,2 ‰ hvis du er påvirket (vurderes etter skjønn og oppførsel). Fargeforklaringen og «Spørsmål og svar» sier det samme.
- 12-timersregelen har fått en tydelig advarsel: den er ikke til å stole på, fordi tiden avhenger av hvor mye, hvor sterkt og hvor tett man har drukket.
- Personvern-boksen er gjort om til en liten linje under ansvarsfraskrivelsen: «100 % privat: det du skriver inn, lagres bare på enheten din.»

## [0.1.1] - 2026-11-11

### Endret

- Personvern-banneret sier nå «Alt du skriver inn, lagres kun lokalt på din egen mobil/PC. Ingenting av det sendes over nett.» Den gamle teksten («Ingen data sendes over nett») stemte ikke helt på ranheimkraft.no, der Umami teller sidevisninger.

## [0.1.0] - 2026-11-11

### Lagt til

- Prosjektet er satt opp med arbeidsregler (`CLAUDE.md`), `.gitignore` og `.gitattributes`.
- Vite-app med React, Tailwind CSS og Lucide React, med `base: './'` for GitHub Pages og `ranheimkraft.no/promille/`.
- Regnemotor (`src/utils/bacCalculator.js`): kroppsvæske med Watsons formel, 10 % resorpsjonstap, gradvis opptak over 30 eller 60 minutter og forbrenning fra første slurk med to kurver (normal 0,15 ‰/t og konservativ 0,10 ‰/t).
- Profil med kjønn, vekt, høyde, alder og mageinnhold.
- Norske drikke-enheter (øl 0,4/0,5/0,6 l, glass vin, drink/dram og shot) med valgbar styrke og størrelse.
- To tidsmoduser: «Logg fortløpende» med redigerbare klokkeslett og «Oppsummer i etterkant» der enhetene fordeles jevnt mellom start og slutt.
- Resultatkort for promille nå med toppunkt, lovgrensen 0,2 ‰ og 0,00 ‰, sikker sone og 12-timersregelen, pluss graf og time-for-time-tabell med fargekoder.
- Fast statuslinje nederst på mobil og dashbord med to kolonner på PC.
- Personvern-banner, ansvarsfraskrivelse og lagring av økten i `localStorage`, med «Start ny kveld / Tøm liste».
- Fontene ligger i bygget (`@fontsource`), så siden gjør ingen eksterne kall.
- SEO: tittel, beskrivelse, canonical, Open Graph, JSON-LD (`WebApplication` og `FAQPage`) og «Spørsmål og svar».
- Tester med Vitest for regnemodell, klokkeslett, appen, lagring, tilgjengelighet (axe) og SEO.
- Workflow som tester, bygger, publiserer forhåndsvisning på GitHub Pages og pusher bygget til grenen `build`.

[Unreleased]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/RanheimGeriljaTV/Kraft-Promille/releases/tag/v0.1.0
