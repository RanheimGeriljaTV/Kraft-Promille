# Arbeidsregler for Kraft Promille

Disse reglene gjelder for alt arbeid i dette repoet, både for mennesker og AI-assistenter.

- **Repo:** `RanheimGeriljaTV/Kraft-Promille`
- **Skal ligge på:** `https://ranheimkraft.no/promille/`
- **Type:** Vite-app (React/JavaScript, Tailwind CSS, Lucide React)

## 0. Første økt: sett opp prosjektet

Er dette en ny mappe, gjør dette før noe annet (og hopp over det som allerede er gjort):

1. Fyll inn `{{…}}`-feltene i denne filen.
2. `git init -b main` og første commit med `.gitignore`, `.gitattributes`, `CLAUDE.md`, `CHANGELOG.md` og `README.md`.
3. Opprett repoet på GitHub og push:

   ```powershell
   gh repo create RanheimGeriljaTV/Kraft-Promille --public --source . --push
   ```

4. Slå på GitHub Pages for forhåndsvisning på `https://ranheimgeriljatv.github.io/Kraft-Promille/` (statisk: fra `main`, rotmappen; Vite: via workflow, se avsnitt 4).
5. Sjekk med `git status` at ingen hemmeligheter eller byggfiler er med.

## 1. Dokumentasjon og versjonering (obligatorisk)

- **Oppdater alltid `CHANGELOG.md`** ved hver endring, feilretting eller ny funksjon.
  - Formatet følger [Keep a Changelog](https://keepachangelog.com/no/1.0.0/).
  - Versjonsnummer følger [Semantic Versioning](https://semver.org/lang/no/) (`MAJOR.MINOR.PATCH`).
  - Uferdige endringer samles under `## [Unreleased]` til de slippes som en versjon.
  - Finnes `package.json`, skal versjonen der stemme med siste versjon i `CHANGELOG.md`.
- **Oppdater alltid `README.md`** når en endring påvirker funksjoner, oppsett eller bruk.
- Tekst i appen, dokumentasjon og commit-meldinger skrives på norsk.

## 2. Kode og design

- Mobil først. Ingen horisontal skrolling på 375 px bredde. Trykkflater minst 44 × 44 px.
- **Bruk bare relative stier** (`css/style.css`, ikke `/css/style.css`). Appen skal virke både på GitHub Pages-forhåndsvisningen og under `ranheimkraft.no/promille/`. I Vite: `base: './'`.
- `index.html` ligger i roten av det som publiseres (repoets rot for statisk, `dist/` for Vite).
- Design følger ranheimkraft.no: mørk bakgrunn (`#08080a`), fontene `Syne` (overskrifter), `Plus Jakarta Sans` (brødtekst) og `JetBrains Mono` (små etiketter), og én aksentfarge per verktøy.
- Legg inn en lenke tilbake til hovedsiden: `<a href="../">← Ranheim Kraft</a>`.
- Tekst fra eksterne kilder (API-er, RSS, brukerinput) settes inn med `textContent`, ikke `innerHTML`. Lenker fra eksterne kilder godtas bare med `https:`.
- Respekter `prefers-reduced-motion` for animasjoner.
- Ikke legg inn Umami selv. Synk-skriptet på ranheimkraft.no legger inn riktig Umami-ID automatisk. Vil du telle knappetrykk, bruk `data-umami-event="promille_…"` på elementet.
- Eksterne skript og biblioteker hentes med fast versjonsnummer (f.eks. `@3.4.17`), ikke «latest».

## 2c. Synlighet på Google (SEO)

Målet er å vinne presise søk folk faktisk skriver (f.eks. «stekeovn til airfryer omregning»), ikke brede ord som store aktører eier.

- **Søkeord:** Skriv ned 3–5 søk siden skal vinne i `README.md` (avsnitt «Søkeord»), og bruk dem i tittel, overskrift og tekst.
- **`<title>`:** Hva siden gjør med søkeordene først, så `| Ranheim Kraft`. Maks ca. 60 tegn. Eksempel: `Stekeovn til airfryer – omregning av tid og temperatur | Ranheim Kraft`.
- **`<meta name="description">`:** 120–155 tegn som svarer på søket og sier at det er gratis.
- **`<link rel="canonical" href="https://ranheimkraft.no/promille/">`** (med avsluttende `/`), og `<html lang="no">`.
- **Open Graph:** `og:title`, `og:description`, `og:url`, `og:type` (`website`), `og:locale` (`nb_NO`) og `og:image` (1200 × 630, eller `https://ranheimkraft.no/assets/og-image.png`).
- **Én `<h1>`** med hovedsøkeordet. Tittelen og innholdet må finnes i HTML-en som lastes, ikke bare etter JavaScript. I Vite: skriv `title`, `meta` og en kort `<noscript>`-tekst rett i `index.html`.
- **Forklarende tekst:** Under verktøyet skal det være en kort seksjon «Spørsmål og svar» med 3–6 spørsmål folk søker på, med svar på 1–3 setninger. Kalkulatorer uten tekst rangerer dårlig.
- **JSON-LD** i `<head>`: `WebApplication` med `name`, `url`, `description`, `applicationCategory` (f.eks. `UtilitiesApplication`, `FinanceApplication`, `GameApplication`), `operatingSystem: "Any"`, `inLanguage: "nb"` og `offers` med `price: "0"` og `priceCurrency: "NOK"`. Har siden spørsmål og svar, legg også til `FAQPage` med de samme spørsmålene (teksten må være lik den som vises).
- **Ytelse og mobil:** Bilder i WebP med `width` og `height`, `loading="lazy"` under bretten, og ingen tunge skript før innholdet vises.
- **Ny side eller ny adresse:** Si fra i nettsidens økt, så legges den i `sitemap.xml`. Be deretter om indeksering i Google Search Console.

## 3. Hemmeligheter

- Ingen hemmeligheter (API-nøkler, tokens, passord) skal noen gang committes.
- Alt i en statisk nettside er offentlig. Nøkler som må være hemmelige, hører hjemme i en backend (Apps Script, Supabase med RLS o.l.), aldri i frontend-koden.
- Lokale variabler ligger i `.env` / `config.local.js`, som er ignorert i `.gitignore`. Dokumenter dem med dummy-verdier i `.env.example` / `config.example.js`.

## 4. Publisering på ranheimkraft.no

- Nettsiden ligger i et eget repo: `RanheimGeriljaTV/ranheimkraft.no` (lokalt: `..\ranheimkraft.no`). Dette prosjektet endrer aldri filer der.
- `scripts/sync_subprojects.py` på nettsiden henter dette repoet hver 3. time og kopierer det til `promille/`.
  - **Statisk:** fra `main`.
  - **Vite:** fra grenen `build`. Bruk en workflow som Kraft-Fryer sin `.github/workflows/deploy.yml`: lint, test og bygg på `main`, og push `dist/` til `build`.
- Første gang må prosjektet kobles på nettsiden. Det gjøres i nettsidens egen økt: synk-funksjon, menylenke, kort på forsiden, `sitemap.xml` og changelog.
- Haster en oppdatering, kjør «🔄 Auto-Sync Subprosjekter» manuelt under Actions i ranheimkraft.no-repoet.

## 5. GitHub og git

- `gh` er autentisert som **`RanheimGeriljaTV`**. Kjør alle `gh`-kommandoer ikke-interaktivt med parametere.
- Bruk [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`. Ta med versjonen når en ny slippes, f.eks. `feat: nedtellingsklokke (v1.2.0)`.
- Kontroller alltid `git status` før commit.
- Linjeskift er LF (`.gitattributes`). Bilder og fonter er merket som binære.
