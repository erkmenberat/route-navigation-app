# Route Navigation App

Mobile Navigations-App mit NestJS Backend, PostgreSQL, Prisma, Expo Router und Mapbox. Die App unterstuetzt Registrierung/Login per JWT, geschuetzte Profil- und Verlauf-Endpoints, Kartendarstellung, Zielsuche, Routenberechnung und Routenspeicherung.

## Projektstruktur

```text
route-navigation-app/
|-- backend/   NestJS API, Prisma, PostgreSQL
|-- mobile/    Expo React Native App
|-- docker-compose.yml
|-- pnpm-workspace.yaml
`-- package.json
```

## Voraussetzungen

- Node.js `20.19+` oder `22.13+`
- pnpm `11.3+`
- Docker Desktop oder eine lokale PostgreSQL-Installation
- Android Studio mit Emulator oder ein echtes Android-Geraet
- Mapbox Access Token
- Expo CLI ueber `pnpm exec expo` oder `npx expo`

Hinweis: Die App nutzt `@rnmapbox/maps` und `expo-dev-client`. Expo Go reicht fuer die native Mapbox-Karte nicht aus. Nutze einen Development Build, z. B. ueber `pnpm run mobile:android`.

## Installation

Repository klonen und Abhaengigkeiten im Workspace-Root installieren:

```bash
git clone <repository-url>
cd route-navigation-app
pnpm install
```

Der Workspace installiert Backend und Mobile-App gemeinsam. Die relevanten Packages sind in `pnpm-workspace.yaml` als `backend` und `mobile` registriert.

## Umgebungsvariablen

Es gibt zwei relevante Env-Dateien:

- `.env` im Root fuer Docker Compose und die Mobile-App
- `backend/.env` fuer NestJS und Prisma

Root-Datei erstellen:

```bash
cp .env.example .env
```

Beispiel fuer `.env`:

```env
POSTGRES_DB=navigation_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Backend-Datei erstellen:

```bash
cp backend/.env.example backend/.env
```

Wenn PostgreSQL ueber die mitgelieferte `docker-compose.yml` laeuft, muss die Datenbank-URL den Host-Port `5433` verwenden:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/navigation_app"
JWT_SECRET="replace-with-a-long-random-secret"
MAPBOX_API_KEY="pk.your_mapbox_token"
```

Falls PostgreSQL lokal direkt auf Port `5432` laeuft, passe `DATABASE_URL` entsprechend an.

## Datenbank starten

PostgreSQL per Docker starten:

```bash
docker compose up -d
```

Die Compose-Datei startet einen Container `route-navigation-postgres` und mappt PostgreSQL von Container-Port `5432` auf Host-Port `5433`.

## Prisma

Migrationen ausfuehren und Prisma Client generieren:

```bash
pnpm --filter backend prisma:migrate
pnpm run prisma:generate
```

Weitere Prisma-Befehle:

```bash
pnpm run prisma:validate
pnpm --filter backend prisma:studio
```

## Backend starten

Development Server:

```bash
pnpm run backend:start:dev
```

Das Backend lauscht standardmaessig auf `http://localhost:3000`. Der Port kann mit `PORT` in `backend/.env` ueberschrieben werden.

Wichtige Endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/profile`
- `POST /routes/history`
- `GET /routes/history`

Geschuetzte Endpoints erwarten einen JWT Bearer Token im `Authorization` Header.

## Mobile-App starten

Development Build fuer Android starten:

```bash
pnpm run mobile:android
```

Metro/Expo separat starten:

```bash
pnpm run mobile:start
```

Falls ein echtes Android-Geraet verwendet wird, ist `localhost` aus Sicht des Geraets nicht der Rechner. Setze dann in `.env`:

```env
EXPO_PUBLIC_API_URL=http://<deine-lokale-ip>:3000
```

Beispiel: `http://192.168.0.25:3000`.

## Tests und Qualitaetschecks

Backend-Tests:

```bash
pnpm run backend:test
```

Backend-Build:

```bash
pnpm run backend:build
```

Mobile Lint:

```bash
pnpm run mobile:lint
```

## Nuetzliche Root-Skripte

```bash
pnpm run backend:start
pnpm run backend:start:dev
pnpm run backend:build
pnpm run backend:test
pnpm run mobile:start
pnpm run mobile:android
pnpm run mobile:lint
pnpm run prisma:generate
pnpm run prisma:validate
```

## Abgabe-Checkliste

- `.env.example` ist vorhanden, echte Secrets bleiben lokal in `.env`
- `.env` ist in `.gitignore` ausgeschlossen
- `node_modules`, Build-Ausgaben und lokale Expo-Dateien werden nicht committet
- PostgreSQL laeuft und Migrationen wurden ausgefuehrt
- Backend startet ohne Fehler
- Mobile-App laeuft als Android Development Build
- Mapbox Token ist gesetzt und die Karte rendert im Development Build
- Backend-Tests laufen mit `pnpm run backend:test`
