# Endringslogg

Alle viktige endringer i dette prosjektet dokumenteres i denne filen.

Formatet er basert på [Keep a Changelog](https://keepachangelog.com/no/1.0.0/),
og prosjektet følger [Semantic Versioning](https://semver.org/lang/no/).

## [Unreleased]

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

[Unreleased]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/RanheimGeriljaTV/Kraft-Promille/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/RanheimGeriljaTV/Kraft-Promille/releases/tag/v0.1.0
