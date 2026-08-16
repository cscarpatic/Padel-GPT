# PADEL//NOVA

Esperienza di padel 3D real-time per browser, pensata per essere pubblicata direttamente su **GitHub Pages**. Il progetto è completamente statico: non richiede backend, database o servizi esterni a runtime.

## Stato del prodotto

Questa release trasforma il prototipo originale in una base production-ready per il web:

- rendering Three.js/WebGL con PBR, tone mapping ACES, bloom adattivo, ombre e arena notturna;
- campo 10×20 m con linee di servizio a 6,95 m e rete regolamentare;
- servizio con rimbalzo prima del colpo, diagonale alternata e seconda palla;
- gestione dei vetri: la parete avversaria è valida solo dopo il primo rimbalzo;
- punteggio 0/15/30/40, vantaggi, game, set e tie-break a 6–6;
- IA Rookie / Pro / Elite;
- tre telecamere dinamiche;
- tastiera, touch analogico e gamepad;
- menu, pausa, fullscreen, audio, statistiche e impostazioni persistenti;
- preset grafici Auto / Performance / Bilanciata / Ultra;
- PWA installabile con service worker e cache runtime;
- build Vite ottimizzata e deploy automatico con GitHub Actions;
- test automatici sul motore di punteggio e quality gate di build.

> Il gameplay è una reinterpretazione 1-vs-1 pensata per il browser. Il padel competitivo ufficiale è normalmente giocato in doppio.


## Repository ufficiale

- Repository: `cscarpatic/Padel-GPT`
- GitHub Pages previsto: `https://cscarpatic.github.io/Padel-GPT/`

La configurazione Vite rileva automaticamente il nome `Padel-GPT` durante GitHub Actions e genera gli asset con base path `/Padel-GPT/`.

## Requisiti locali

- Node.js 20.19+ oppure 22.12+
- npm
- browser moderno con WebGL e accelerazione hardware

Il workflow GitHub usa Node 22.

## Avvio in sviluppo

```bash
npm install
npm run dev
```

Vite mostrerà l'indirizzo locale, normalmente `http://localhost:5173`.

## Quality gate

```bash
npm run check
```

Esegue, nell'ordine:

1. controllo sintattico JavaScript;
2. unit test del punteggio;
3. build production Vite.

Per provare esattamente la build finale:

```bash
npm run build
npm run preview
```

## Pubblicazione su GitHub Pages

Il repository contiene già `.github/workflows/deploy.yml`.

1. Crea un repository GitHub e inserisci questi file nella branch `main`.
2. Vai in **Settings → Pages**.
3. In **Build and deployment → Source**, seleziona **GitHub Actions**.
4. Fai push su `main`.
5. Il workflow esegue quality gate, genera `dist/` e pubblica il sito.

### URL di progetto

Per un repository standard come:

```text
https://github.com/utente/padel-nova
```

Vite calcola automaticamente la base di deploy come:

```text
/ padel-nova /
```

(senza gli spazi, mostrati qui solo per leggibilità), quindi asset, manifest e service worker funzionano anche sotto `https://utente.github.io/padel-nova/`.

Per un repository `utente.github.io`, la base rimane `/`.

### Dominio personalizzato

Se GitHub Pages usa un dominio personalizzato, imposta nel job di build:

```yaml
env:
  VITE_BASE_PATH: /
```

Poi configura il dominio da **Settings → Pages** secondo la procedura GitHub.

## Controlli

| Azione | Tastiera | Gamepad / touch |
|---|---|---|
| Movimento | WASD / frecce | stick sinistro / stick touch |
| Colpo / servizio | Space | A / HIT |
| Sprint | Shift | — |
| Camera | C | Y |
| Pausa | P / Esc | Start |
| Fullscreen | F | pulsante HUD |

Durante il colpo, la direzione di movimento influenza la mira. Muoversi indietro durante l'impatto favorisce un lob; le palle alte generano uno smash più potente.

## Struttura

```text
padel3d/
├─ .github/workflows/
│  ├─ ci.yml
│  └─ deploy.yml
├─ public/
│  ├─ favicon.svg
│  ├─ icon-192.png
│  ├─ icon-512.png
│  ├─ manifest.webmanifest
│  ├─ robots.txt
│  └─ sw.js
├─ src/
│  ├─ main.js
│  ├─ scoring.js
│  └─ style.css
├─ tests/
│  └─ scoring.test.js
├─ index.html
├─ package.json
└─ vite.config.js
```

## Dipendenze bloccate

- Three.js `0.185.1`
- Vite `8.2.1`

Le dipendenze vengono bundle-izzate nella build: la versione pubblicata su Pages non carica Three.js o font da CDN.

## Regole di campo e servizio

Le dimensioni e le regole implementate prendono come riferimento le **Rules of Padel** della International Padel Federation (FIP), in vigore dal 1 gennaio 2026: campo 10×20 m, linee di servizio a 6,95 m, rete a 0,88 m al centro, servizio dopo rimbalzo e in diagonale.

Documento di riferimento: `https://www.padelfip.com/wp-content/uploads/2024/11/FIP-Rules-of-Padel.pdf`

## Limiti attuali e roadmap AAA

La release è professionale come prodotto web statico, ma gli atleti sono ancora procedurali e non fotogrammetrici. Per un salto visivo ulteriore, senza abbandonare GitHub Pages, le evoluzioni consigliate sono:

- personaggi GLB/GLTF ottimizzati con skeletal animation e motion capture;
- texture PBR compresse KTX2/Basis e mesh Draco/Meshopt;
- animazioni specifiche bandeja, vibora, bajada, volley e smash;
- audio campionato multistrato e riverbero dell'arena;
- modalità doppio 2-vs-2 con tre IA;
- replay e photo mode;
- worker dedicato per fisica e prediction;
- leaderboard o multiplayer solo aggiungendo un servizio backend esterno.

GitHub Pages può ospitare perfettamente il client e gli asset statici; funzioni server-side richiedono invece un servizio separato.

## Licenza

Non è inclusa una licenza open-source. Prima di distribuire o commercializzare pubblicamente il progetto, aggiungi la licenza adatta e verifica le licenze di eventuali asset 3D/audio che verranno aggiunti in futuro.
