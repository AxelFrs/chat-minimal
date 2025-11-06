# mistral-chat-minimal

Mini application **Next.js + TypeScript** démontrant un **chat en streaming** avec une route API `/api/chat`. Le projet fonctionne **sans clé (FAKE)** ou avec l’API **Mistral (REAL)** et inclut des **tests** + un **script d’évaluation**. Docker est **optionnel**.

---

## 1) Aperçu rapide
- **UI de chat** : champ de saisie, réponses **streamées**, bouton **Stop**, autoscroll.
- **API serveur** (`/api/chat`) :
  - **FAKE** (par défaut) — aucune clé nécessaire.
  - **REAL** — proxie l’API Mistral via clé côté serveur.
- **Tests** (Vitest) + **évaluation** (`pnpm eval`).


---

## 2) Lancer le projet (sans Docker)
### A. Démarrage rapide (FAKE — aucune clé) (Inintérressant pour l'instant)
```bash
pnpm install
cp .env.example .env.local
pnpm dev
# → http://localhost:3000
```

### B. Passer en REAL (avec clé)
2 façons :

**B1) Avec fichier `.env.local` (recommandé)**
```bash
cp .env.example .env.local
# éditez .env.local et mettez :
MISTRAL_API_KEY=VOTRE_CLE_API
USE_FAKE_MISTRAL=
# (optionnel) MISTRAL_MODEL=mistral-small-latest
pnpm dev
# → http://localhost:3000
```
> `.env.local` est **exclu du repo** (non commité). Utilisez `.env.example` comme modèle.

**B2) Sans fichier (macOS/Linux, bash/zsh)**
```bash
MISTRAL_API_KEY=VOTRE_CLE USE_FAKE_MISTRAL= pnpm dev
# puis ouvrez http://localhost:3000
```

**B3) Sans fichier (Windows PowerShell)**
```powershell
$env:MISTRAL_API_KEY="VOTRE_CLE"; $env:USE_FAKE_MISTRAL=""; pnpm dev
# puis ouvrez http://localhost:3000
```

---

## 3) Lancer avec Docker (optionnel)
Prérequis : Docker Desktop installé et démarré.

### A. Build de l’image
```bash
pnpm docker:build #À faire une seule fois
```

### B. Run (FAKE)
```bash
cp .env.example .env.local
pnpm docker:run
# → http://localhost:3000
```

### C. Run (REAL) — sans fichier
```bash
docker run --rm -p 3000:3000 \
  -e MISTRAL_API_KEY=VOTRE_CLE -e USE_FAKE_MISTRAL= \
  mistral-chat
```

### D. Run (REAL) - avec fichier
modifier .env.local comme expliqué dans la section 2.B1

---

## 4) Tester l’API locale
### Santé
Ouvrir : `http://localhost:3000/api/chat` → renvoie `{ mode: "FAKE" | "REAL" }`.

### POST (réponse complète)
```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello"}'
```

### POST (streaming)
```bash
curl -N -s -X POST 'http://localhost:3000/api/chat?stream=1' \
  -H 'Content-Type: application/json' \
  -d '{"message":"bonjour en streaming"}'
```

---

## 5) Tests & évaluation
### Tests unitaires (Vitest)
```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

### Mini évaluation (3 prompts → CSV)
```bash
pnpm eval          # imprime un CSV sur stdout
pnpm eval > results.csv
```

---

## 6) Structure du projet
```
app/
  api/chat/route.ts    # Endpoint FAKE/REAL + streaming (Edge)
  page.tsx             # Accueil
components/
  Chat.tsx             # UI client (streaming, Stop, autoscroll)
lib/
  chat.ts              # Fonctions pures (payload, fakeReply)
scripts/
  eval.ts              # Mini éval (3 prompts → CSV)
tests/
  chat.test.ts         # Vitest (payload + fake reply)
next.config.ts         # output: 'standalone'
Dockerfile             # multi-stage (deps → build → runner)
.dockerignore
```

---

## 7) Dépannage rapide
- **Mode REAL sans réponse** : vérifier `MISTRAL_API_KEY` et que `USE_FAKE_MISTRAL` est **vide**.
- **Port occupé** : remplacer `-p 3000:3000` par `-p 3001:3000` et ouvrir `http://localhost:3001`.


