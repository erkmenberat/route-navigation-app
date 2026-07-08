# Navigation App / Taxi App

Taxi- und Navigations-App mit Expo React Native, NestJS, PostgreSQL, Prisma,
Socket.IO und Mapbox. Die App verbindet klassische Routenplanung mit
rollenbasierten Fahrer-/Kunden-Flows: Nutzer koennen Ziele suchen oder direkt
auf der Karte antippen, Routen berechnen, Preise schaetzen, Fahrten anfragen,
Fahrer koennen Anfragen live annehmen und starten.

## Projektstatus

Dieses Projekt ist ein Lernprojekt. Es wurde gebaut, um React Native, Expo,
NestJS, PostgreSQL, Prisma, Socket.IO, Mapbox und Android-Development praktisch
zu lernen und zu testen.

Die App ist deshalb nicht als wirtschaftlich produktionsreife Anwendung zu
verstehen. Fuer echte kommerzielle Nutzung wuerden normalerweise weitere
Schritte fehlen, zum Beispiel Security-Hardening, vollstaendige Testabdeckung,
Monitoring, saubere CI/CD-Prozesse, Datenschutz-/Compliance-Pruefungen,
Payment-/Betriebsprozesse, Skalierungskonzepte und ein stabiler Release-Flow.

Fuer Testzwecke, Lernen, lokale Entwicklung und technische Demonstrationen kann
das Projekt verwendet werden. Es wurde bewusst in diesem Zustand auf `main`
gepusht, obwohl man das in einem echten Produktionsprojekt normalerweise nicht
so machen wuerde. In einem professionellen Umfeld wuerden Aenderungen ueber
Branches, Pull Requests, Reviews, CI-Checks und kontrollierte Releases laufen.

## Demo

> Hier kommen spaeter deine App-Bilder und Videos rein.

Empfohlene Struktur:

```text
docs/
`-- media/
    |-- app-home.png
    |-- route-selection.png
    |-- ride-request-user.png
    |-- ride-request-driver.png
    |-- chat.png
    `-- demo.mp4
```

Beispiel fuer Screenshots:

```md
| Home / Karte | Routenplanung | Fahrer-Anfrage |
| --- | --- | --- |
| ![Home](docs/media/app-home.png) | ![Route](docs/media/route-selection.png) | ![Ride Request](docs/media/ride-request-user.png) |
```

Beispiel fuer ein Video:

```html
<video src="docs/media/demo.mp4" controls width="100%"></video>
```

## Features

- Registrierung und Login mit JWT Access Token und Refresh Token
- Rollenmodell fuer normale Nutzer und Fahrer
- Fahrer-Registrierung mit Taxi-Daten
- Geschuetzte Profil- und User-Suche
- Mapbox-Karte mit Standort, Kamera-Steuerung und Routenlinie
- Zielsuche ueber Mapbox Geocoding
- Zielauswahl durch Tippen auf die Karte
- Routenberechnung ueber Mapbox Directions
- Preis-/Routenschaetzung im Backend
- Speicherung und Loeschung von Routenverlauf
- Live-Taxi-Karte ueber Socket.IO
- Ride-Request-Flow:
  - Nutzer fragt Fahrt an
  - alle online Fahrer erhalten die Anfrage
  - genau ein Fahrer kann die Fahrt annehmen
  - Fahrer startet die Fahrt separat
  - Nutzer oder Fahrer koennen abbrechen
- Chat- und Nachrichtenbereich mit REST- und Socket.IO-Events
- Mobile Token-Refresh und Socket-Reconnect-Handling

## Tech Stack

| Bereich | Technologie |
| --- | --- |
| Mobile | Expo 54, React Native 0.81, Expo Router |
| Karte | Mapbox, `@rnmapbox/maps`, `expo-location` |
| Backend | NestJS 11, Socket.IO, Passport JWT |
| Datenbank | PostgreSQL 16 |
| ORM | Prisma 7 |
| Package Manager | pnpm 11 Workspace |
| Android | Expo Development Build / native Android-Projekt |

## Projektstruktur

```text
route-navigation-app/
|-- backend/              NestJS API, Prisma, PostgreSQL, Socket.IO
|   |-- prisma/           Prisma Schema und Migrationen
|   `-- src/              Auth, Users, Routes, Taxi, Rides, Chat, Messages
|-- mobile/               Expo React Native App
|   |-- app/              Expo Router Screens und Tabs
|   |-- components/       UI- und Home-Komponenten
|   |-- hooks/            Mapbox, Navigation, Location, Socket Hooks
|   |-- services/         API, Auth Token, Socket, Routes, Rides
|   `-- types/            Mobile TypeScript-Typen
|-- android/              Native Android-Projekt fuer Dev Builds
|-- docker-compose.yml    Lokale PostgreSQL-Datenbank
|-- pnpm-workspace.yaml   Workspace-Konfiguration
`-- package.json          Root-Skripte
```

## Voraussetzungen

- Node.js `20.19+`, `22.13+` oder neuer
- pnpm `11.3+`
- Docker Desktop oder lokale PostgreSQL-Installation
- Android Studio mit Emulator oder echtes Android-Geraet
- Mapbox Access Token
- Expo Development Build

Wichtig: Expo Go reicht fuer diese App nicht aus, weil die native Mapbox
Bibliothek `@rnmapbox/maps` verwendet wird. Nutze `pnpm run mobile:android`
oder einen passenden Development Build.

## Installation

```bash
git clone <repository-url>
cd route-navigation-app
pnpm install
```

Der Root-Workspace installiert `backend` und `mobile` gemeinsam.

## Environment

Es gibt zwei relevante Env-Dateien:

- `.env` im Root fuer Docker Compose und die Mobile-App
- `backend/.env` fuer NestJS und Prisma

Root-Datei erstellen:

```bash
cp .env.example .env
```

Beispiel:

```env
POSTGRES_DB=navigation_app
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
```

Backend-Datei erstellen:

```bash
cp backend/.env.example backend/.env
```

Wenn PostgreSQL ueber `docker-compose.yml` laeuft, nutzt der Host den Port
`5433`, obwohl PostgreSQL im Container auf `5432` laeuft:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/navigation_app"
JWT_SECRET="replace-with-a-long-random-secret-with-at-least-32-chars"
PORT=3000
```

Falls PostgreSQL lokal direkt auf `5432` laeuft, passe `DATABASE_URL`
entsprechend an.

### Android API URL

Bei Android ist `localhost` nicht immer dein Rechner:

- Android Emulator: meistens `http://10.0.2.2:3000`
- echtes Geraet im gleichen WLAN: `http://<deine-lokale-ip>:3000`
- echtes Android-Geraet per USB-Kabel: `http://localhost:3000` funktioniert nur
  mit `adb reverse`
- iOS Simulator / lokaler Desktop-Kontext: meistens `http://localhost:3000`

Setze dafuer `EXPO_PUBLIC_API_URL` in der Root-`.env`.

#### USB-Geraet mit `localhost` nutzen

Wenn die App auf einem echten Android-Geraet laeuft, bedeutet `localhost`
normalerweise: "dieses Handy". Das Backend laeuft aber auf deinem Windows-PC.
Damit `http://localhost:3000` auf dem Handy trotzdem zu deinem lokalen NestJS
Backend weitergeleitet wird, kannst du per USB-Port-Forwarding `adb reverse`
verwenden.

Pruefe zuerst, ob das Geraet per ADB sichtbar ist:

```powershell
C:\Users\erkme\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
```

Wenn dein Geraet mit der ID `R7AXC0AVKHR` angezeigt wird, fuehre aus:

```powershell
C:\Users\erkme\AppData\Local\Android\Sdk\platform-tools\adb.exe -s R7AXC0AVKHR reverse tcp:3000 tcp:3000
```

Danach kann die Mobile-App auf dem USB-Geraet diese URL verwenden:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Was der Befehl macht:

- `adb.exe`: Android Debug Bridge aus deinem Android SDK
- `-s R7AXC0AVKHR`: waehlt genau dieses angeschlossene Geraet aus
- `reverse tcp:3000 tcp:3000`: leitet Port `3000` vom Android-Geraet zurueck auf
  Port `3000` deines PCs

Wichtig:

- Der Befehl muss erneut ausgefuehrt werden, wenn das Geraet getrennt,
  neugestartet oder ADB neu gestartet wurde.
- Das Backend muss auf dem PC laufen: `pnpm run backend:start:dev`.
- In `backend/src/main.ts` lauscht NestJS auf `0.0.0.0`; dadurch ist die API
  fuer Emulator, echtes Geraet und Reverse-Port-Forwarding erreichbar.
- Wenn du den Backend-Port aenderst, musst du beide Ports im Befehl anpassen,
  z. B. `reverse tcp:4001 tcp:4001`.

## Datenbank

PostgreSQL starten:

```bash
docker compose up -d
```

Migrationen ausfuehren:

```bash
pnpm --filter backend prisma:migrate
```

Prisma Client generieren:

```bash
pnpm run prisma:generate
```

Weitere Prisma-Befehle:

```bash
pnpm run prisma:validate
pnpm --filter backend prisma:studio
```

Wenn du nur pruefen willst, ob die Datenbank zum Migrationsstand passt:

```bash
cd backend
pnpm exec prisma migrate status
```

## Entwicklung starten

Backend starten:

```bash
pnpm run backend:start:dev
```

Das Backend laeuft standardmaessig auf:

```text
http://localhost:3000
```

Mobile-App fuer Android starten:

```bash
pnpm run mobile:android
```

Metro/Expo separat starten:

```bash
pnpm run mobile:start
```

## Wichtige Backend-Routen

### Auth

| Methode | Route | Zweck |
| --- | --- | --- |
| `POST` | `/auth/register` | Nutzer registrieren |
| `POST` | `/auth/register/driver` | Fahrer mit Taxi-Daten registrieren |
| `POST` | `/auth/login` | Login |
| `POST` | `/auth/refresh` | Access Token erneuern |
| `POST` | `/auth/logout` | Refresh Token invalidieren |
| `GET` | `/auth/me` | Aktuellen JWT-User lesen |

### Users

| Methode | Route | Zweck |
| --- | --- | --- |
| `GET` | `/users/profile` | Eigenes Profil |
| `GET` | `/users/search` | Nutzer fuer Chat suchen |

### Routes

| Methode | Route | Zweck |
| --- | --- | --- |
| `GET` | `/routes/estimate` | Preis fuer Distanz/Dauer schaetzen |
| `POST` | `/routes/history` | Route speichern |
| `GET` | `/routes/history` | Routenverlauf paginiert lesen |
| `DELETE` | `/routes/history/:id` | Eigene Route loeschen |

### Chat und Messages

| Methode | Route | Zweck |
| --- | --- | --- |
| `POST` | `/chats/create-or-get` | Chat mit Nutzer erstellen oder laden |
| `GET` | `/chats` | Eigene Chats lesen |
| `POST` | `/messages/send` | Nachricht senden |
| `GET` | `/messages/:chatId` | Nachrichten eines Chats lesen |

Geschuetzte REST-Routen erwarten:

```http
Authorization: Bearer <access-token>
```

## Socket.IO Events

Die Mobile-App verbindet sich per Socket.IO mit JWT im `auth.token` Feld.

### Taxi Live Map

| Client Event | Server Event | Zweck |
| --- | --- | --- |
| `joinTaxiMap` | `initialTaxiData` | Aktive Taxis initial laden |
| `updateLocation` | `locationUpdated` | Fahrerposition live verteilen |
| - | `taxiConnected` | Fahrer ist online |
| - | `driverDisconnected` | Fahrer ist offline |

### Ride Requests

| Client Event | Server Event | Rolle |
| --- | --- | --- |
| `ride:request` | `ride:requested`, `ride:new` | Nutzer |
| `ride:accept` | `ride:accepted`, `ride:taken` | Fahrer |
| `ride:start` | `ride:started` | Fahrer |
| `ride:cancel` | `ride:cancelled` | Nutzer/Fahrer |
| `ride:active` | `ride:active` | Nutzer/Fahrer |
| - | `ride:error` | Nutzer/Fahrer |

Der Fahrer startet eine Fahrt bewusst separat nach dem Annehmen. Annehmen und
Starten sind zwei getrennte Aktionen.

### Chat

| Client Event | Server Event | Zweck |
| --- | --- | --- |
| `message:send` | `message:receive` | Live-Nachricht senden/empfangen |
| `message:read` | `message:read` | Gelesen-Status |
| `message:ack` | `message:delivered` | Zustellung bestaetigen |
| - | `user:status` | Online-/Offline-Status |

## Datenmodell

Zentrale Prisma-Modelle:

- `User`: Account, Rolle, Online-Status
- `Taxi`: Fahrerfahrzeug und Live-Standortdaten
- `Route`: gespeicherter Routenverlauf
- `RideRequest`: aktive und historische Fahrtanfragen
- `Chat`: Chat zwischen zwei Nutzern
- `Message`: Nachrichten eines Chats
- `RefreshToken`: persistierte Refresh Tokens

`Route` und `RideRequest` sind bewusst getrennt: `Route` beschreibt gespeicherte
Navigation/History, `RideRequest` beschreibt den Fahrt-Lifecycle mit Status wie
`PENDING`, `ACCEPTED`, `STARTED`, `COMPLETED` und `CANCELLED`.

## Root-Skripte

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

## Qualitaetschecks

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

Hinweis fuer Windows/CI-nahe Umgebungen: Falls Jest beim parallelen Starten von
Workern mit `spawn EPERM` scheitert, fuehre fokussierte Backend-Tests mit
`--runInBand` aus.

## Production Readiness Checkliste

- Keine echten Secrets im Repository
- `.env` und lokale Build-Ausgaben bleiben ignoriert
- `JWT_SECRET` ist lang, zufaellig und nicht wiederverwendet
- PostgreSQL-Migrationen sind angewendet
- Prisma Client ist nach Schema-Aenderungen neu generiert
- Backend startet ohne Fehler
- Mobile-App laeuft als Development Build
- Mapbox Token ist gesetzt und die Karte rendert
- Android nutzt eine erreichbare `EXPO_PUBLIC_API_URL`
- Socket-Verbindung funktioniert nach App-Neustart und Token Refresh
- Ride-Request-Flow wurde mit mindestens einem Nutzer und einem Fahrer getestet
- Fahrer kann annehmen und danach separat starten
- Abbruch durch Nutzer und Fahrer sendet `ride:cancelled`
- Route-History kann erstellt und geloescht werden
- Chat sendet, empfaengt und aktualisiert Zustell-/Gelesen-Status

## Troubleshooting

### Karte bleibt leer

- Pruefe `EXPO_PUBLIC_MAPBOX_TOKEN` in der Root-`.env`.
- Starte die App als Development Build, nicht mit Expo Go.
- Starte Metro nach Env-Aenderungen neu.

### Mobile-App erreicht Backend nicht

- Pruefe `EXPO_PUBLIC_API_URL`.
- Nutze beim Android Emulator `http://10.0.2.2:3000`.
- Nutze auf echtem Android-Geraet die lokale IP deines Rechners.
- Wenn das echte Android-Geraet per USB-Kabel verbunden ist und du
  `http://localhost:3000` nutzen willst, fuehre vorher `adb reverse` aus:
  `C:\Users\erkme\AppData\Local\Android\Sdk\platform-tools\adb.exe -s R7AXC0AVKHR reverse tcp:3000 tcp:3000`.
- Pruefe, ob `pnpm run backend:start:dev` laeuft.

### Prisma kann keine Verbindung herstellen

- Pruefe, ob Docker laeuft: `docker compose up -d`.
- Bei Docker muss `DATABASE_URL` den Host-Port `5433` verwenden.
- Pruefe den Migrationsstand mit `cd backend && pnpm exec prisma migrate status`.

### Expo Go funktioniert nicht

Das ist erwartet. Die App nutzt native Mapbox-Module und braucht einen
Development Build.
