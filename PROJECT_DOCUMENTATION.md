# Route Navigation App - Projektdokumentation

Stand: 2026-06-09

## Kurzuebersicht

Dieses Repository ist ein Full-Stack-Projekt fuer eine Route-Navigation-App. Es ist als Monorepo mit getrenntem Backend und Frontend aufgebaut:

- `backend/`: NestJS-API mit TypeScript, Prisma ORM, PostgreSQL, Authentifizierung per JWT und Passwort-Hashing mit bcrypt.
- `frontend/`: Expo/React-Native-App mit Expo Router, Tab-Navigation und dem aktuellen Expo-Starter-Template.
- `docker-compose.yml`: Lokaler PostgreSQL-Service fuer die Backend-Datenbank.

Der bisher am weitesten ausgebaute Teil ist das Backend. Dort existieren Datenbankmodelle fuer Benutzer und Routen sowie Register- und Login-Endpunkte. Das Frontend ist technisch eingerichtet, enthaelt aber noch groesstenteils Beispielseiten aus dem Expo-Template.

## Repository-Struktur

```text
route-navigation-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── auth/
│   │   ├── generated/prisma/
│   │   ├── prisma/
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   └── modal.tsx
│   ├── assets/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
└── README.md
```

## Tech Stack

### Backend

- Runtime: Node.js
- Sprache: TypeScript
- Framework: NestJS 11
- Datenbank: PostgreSQL 16 per Docker Compose
- ORM: Prisma 7
- Authentifizierung: Passport, JWT, `@nestjs/jwt`, `passport-jwt`
- Passwort-Hashing: bcrypt
- Validierung: `class-validator`, `class-transformer`, globaler NestJS `ValidationPipe`
- Tests: Jest, Supertest, NestJS Testing Utilities
- Linting/Formatierung: ESLint 10, TypeScript ESLint, Prettier 3
- Package Manager: pnpm, im Backend auf `pnpm@10.34.1` festgelegt

### Frontend

- Framework: Expo 54
- UI-Technologie: React Native 0.81
- Sprache: TypeScript
- Routing: Expo Router 6 mit file-based routing
- Navigation: React Navigation 7, Bottom Tabs
- Web-Unterstuetzung: React Native Web
- Icons: Expo Vector Icons und Expo Symbols
- Animation/Haptik: React Native Reanimated, Expo Haptics
- Linting: Expo ESLint Config mit ESLint 9

### Infrastruktur

- Lokale Datenbank: PostgreSQL 16 Container
- Datenbank-Port lokal: `5433`, intern im Container `5432`
- Persistenz: Docker Volume `postgres_data`
- Healthcheck: `pg_isready`

## Package-Versionen

Die folgenden Versionen stammen aus den jeweiligen `package.json` Dateien. Einige Versionen sind als Semver-Ranges deklariert, zum Beispiel `^`, `~` oder exakte Versionen.

### Root `package.json`

| Package | Version |
| --- | --- |
| dotenv | `^17.4.2` |

### Backend Dependencies

| Package | Version |
| --- | --- |
| @nestjs/common | `^11.1.24` |
| @nestjs/config | `^4.0.4` |
| @nestjs/core | `^11.1.24` |
| @nestjs/jwt | `^11.0.2` |
| @nestjs/passport | `^11.0.5` |
| @nestjs/platform-express | `^11.1.24` |
| @prisma/client | `^7.8.0` |
| bcrypt | `^6.0.0` |
| class-transformer | `^0.5.1` |
| class-validator | `^0.15.1` |
| dotenv | `^17.2.3` |
| passport | `^0.7.0` |
| passport-jwt | `^4.0.1` |
| reflect-metadata | `^0.2.2` |
| rxjs | `^7.8.2` |

### Backend Dev Dependencies

| Package | Version |
| --- | --- |
| @babel/core | `7.29.7` |
| @electric-sql/pglite | `^0.4.6` |
| @emnapi/core | `^1.10.0` |
| @emnapi/runtime | `^1.10.0` |
| @eslint/eslintrc | `^3.3.5` |
| @eslint/js | `^10.0.1` |
| @jest/transform | `30.4.1` |
| @jest/types | `30.4.1` |
| @nestjs/cli | `^11.0.21` |
| @nestjs/schematics | `^11.1.0` |
| @nestjs/testing | `^11.1.24` |
| @types/bcrypt | `^6.0.0` |
| @types/eslint | `9.6.1` |
| @types/express | `^5.0.6` |
| @types/jest | `^30.0.0` |
| @types/node | `^24.10.0` |
| @types/passport-jwt | `^4.0.1` |
| @types/react | `19.2.15` |
| @types/supertest | `^7.2.0` |
| @typescript-eslint/parser | `^8.60.0` |
| acorn | `^8.16.0` |
| add | `^2.0.6` |
| ajv | `^7.2.0` |
| babel-jest | `30.4.1` |
| browserslist | `^4.28.2` |
| chokidar | `^4.0.3` |
| eslint | `^10.4.0` |
| eslint-config-prettier | `^10.1.8` |
| eslint-plugin-prettier | `^5.5.5` |
| globals | `^17.6.0` |
| hono | `^3.8.3` |
| jest | `^30.4.2` |
| jest-resolve | `30.4.1` |
| jest-util | `30.4.1` |
| jiti | `2.7.0` |
| picomatch | `^4.0.4` |
| prettier | `^3.8.3` |
| prisma | `^7.8.0` |
| react | `19.2.6` |
| react-dom | `19.2.6` |
| source-map-support | `^0.5.21` |
| supertest | `^7.2.2` |
| ts-jest | `^29.4.11` |
| ts-loader | `^9.5.7` |
| ts-node | `^10.9.2` |
| tsconfig-paths | `^4.2.0` |
| typescript | `^6.0.3` |
| typescript-eslint | `^8.60.0` |
| webpack | `5.106.0` |

### Frontend Dependencies

| Package | Version |
| --- | --- |
| @expo/vector-icons | `^15.0.3` |
| @react-navigation/bottom-tabs | `^7.4.0` |
| @react-navigation/elements | `^2.6.3` |
| @react-navigation/native | `^7.1.8` |
| expo | `~54.0.33` |
| expo-constants | `~18.0.13` |
| expo-font | `~14.0.11` |
| expo-haptics | `~15.0.8` |
| expo-image | `~3.0.11` |
| expo-linking | `~8.0.11` |
| expo-router | `~6.0.23` |
| expo-splash-screen | `~31.0.13` |
| expo-status-bar | `~3.0.9` |
| expo-symbols | `~1.0.8` |
| expo-system-ui | `~6.0.9` |
| expo-web-browser | `~15.0.10` |
| react | `19.1.0` |
| react-dom | `19.1.0` |
| react-native | `0.81.5` |
| react-native-gesture-handler | `~2.28.0` |
| react-native-reanimated | `~4.1.1` |
| react-native-safe-area-context | `~5.6.0` |
| react-native-screens | `~4.16.0` |
| react-native-web | `~0.21.0` |
| react-native-worklets | `0.5.1` |

### Frontend Dev Dependencies

| Package | Version |
| --- | --- |
| @types/react | `~19.1.0` |
| eslint | `^9.25.0` |
| eslint-config-expo | `~10.0.0` |
| typescript | `~5.9.2` |

## Backend im Detail

### Startpunkt

Die Datei `backend/src/main.ts` startet die NestJS-App:

- `NestFactory.create(AppModule)` erstellt die Anwendung.
- `ValidationPipe` ist global aktiviert.
- Der Server lauscht auf `process.env.PORT` oder standardmaessig auf Port `3000`.

### Module

`backend/src/app.module.ts` bindet aktuell ein:

- `ConfigModule.forRoot({ isGlobal: true })`
- `PrismaModule`
- `AuthModule`
- `AppController`
- `AppService`

Damit sind Environment-Variablen global verfuegbar, Prisma ist als Datenbank-Service eingebunden und Auth-Endpunkte sind aktiv.

### Prisma-Anbindung

`backend/src/prisma/prisma.service.ts` erweitert den generierten Prisma Client:

- Verbindungsaufbau bei `onModuleInit`
- Trennen der Verbindung bei `onModuleDestroy`

Der Prisma Client wird nicht in `node_modules/@prisma/client` generiert, sondern laut `schema.prisma` nach:

```text
backend/src/generated/prisma
```

### Datenbankmodell

In `backend/prisma/schema.prisma` existieren zwei Models.

#### User

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| id | Int | Primaerschluessel, autoincrement |
| createdAt | DateTime | Erstellungszeitpunkt, Default `now()` |
| email | String | Eindeutige E-Mail-Adresse |
| password | String | Gehashtes Passwort |
| name | String | Benutzername |
| routes | Route[] | Relation zu gespeicherten Routen |

#### Route

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| id | Int | Primaerschluessel, autoincrement |
| userId | Int | Fremdschluessel zum User |
| user | User | Prisma-Relation |
| startLat | Float | Start-Breitengrad |
| finishLat | Float | Ziel-Breitengrad |
| startLong | Float | Start-Laengengrad |
| finishLong | Float | Ziel-Laengengrad |
| startAt | DateTime | Startzeit |
| finishAt | DateTime | Ziel-/Endzeit |
| distance | Float | Distanz |
| duration | Int | Dauer |

### Migrationen

Es gibt eine initiale Migration:

```text
backend/prisma/migrations/20260601094843_init/migration.sql
```

Diese Migration erstellt:

- Tabelle `User`
- Tabelle `Route`
- Unique Index auf `User.email`
- Foreign Key von `Route.userId` auf `User.id`

### Authentifizierung

Der Auth-Bereich liegt in:

```text
backend/src/auth/
```

Wichtige Dateien:

- `auth.module.ts`: Registriert `PassportModule`, `JwtModule` und `JwtStrategy`.
- `auth.controller.ts`: Stellt HTTP-Endpunkte bereit.
- `auth.service.ts`: Enthaelt Register- und Login-Logik.
- `jwt.strategy.ts`: Liest Bearer Tokens aus dem Authorization Header und validiert JWTs.
- `jwt-auth.guard.ts`: Guard auf Basis von Passport Strategy `jwt`.
- `dto/register.dto.ts`: Validierung fuer Registrierung.
- `dto/login.dto.ts`: Validierung fuer Login.

#### Auth-Endpunkte

| Methode | Pfad | Zweck |
| --- | --- | --- |
| POST | `/auth/register` | Benutzer anlegen und JWT zurueckgeben |
| POST | `/auth/login` | Passwort pruefen und JWT zurueckgeben |

#### Register Flow

1. E-Mail wird per Prisma gesucht.
2. Wenn sie bereits existiert, wird `ConflictException` geworfen.
3. Passwort wird mit bcrypt gesalzen und gehasht.
4. Benutzer wird in der Datenbank erstellt.
5. JWT wird erzeugt und als `access_token` zurueckgegeben.

Aktueller JWT-Payload beim Register:

```ts
{ username: newUser.name }
```

Hinweis: Beim Register fehlt aktuell `sub`, obwohl die JWT Strategy `sub` erwartet.

#### Login Flow

1. Benutzer wird ueber E-Mail gesucht.
2. Wenn kein Benutzer existiert, wird `ConflictException` geworfen.
3. Passwort wird mit bcrypt verglichen.
4. Bei falschem Passwort wird `UnauthorizedException` geworfen.
5. JWT wird erzeugt und als `access_token` zurueckgegeben.

Aktueller JWT-Payload beim Login:

```ts
{ sub: exists.id, username: exists.name }
```

### Validierung

Die DTOs verwenden `class-validator`:

- `RegisterDto`: `email`, `password`, `name`
- `LoginDto`: `email`, `password`

Aktuell wird nur geprueft, ob:

- `email` eine E-Mail ist
- `password` ein String ist
- `name` ein String ist

Noch nicht definiert sind Mindestlaengen, Passwortregeln oder Whitespace-/Normalisierungsregeln.

### Backend Scripts

| Script | Befehl | Zweck |
| --- | --- | --- |
| `build` | `nest build` | Backend bauen |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Formatieren |
| `start` | `nest start` | Starten |
| `start:dev` | `nest start --watch` | Development Watch Mode |
| `start:debug` | `nest start --debug --watch` | Debug Watch Mode |
| `start:prod` | `node dist/main` | Production Start |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | Linting mit Auto-Fix |
| `test` | `jest` | Unit Tests |
| `test:watch` | `jest --watch` | Tests im Watch Mode |
| `test:cov` | `jest --coverage` | Coverage |
| `test:debug` | Jest mit Node Inspector | Debugging von Tests |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | E2E Tests |
| `prisma:generate` | `prisma generate` | Prisma Client generieren |
| `prisma:validate` | `prisma validate` | Prisma Schema validieren |
| `prisma:migrate` | `prisma migrate dev` | Migration ausfuehren/erstellen |
| `prisma:studio` | `prisma studio` | Prisma Studio starten |

## Frontend im Detail

### App-Konfiguration

Die zentrale Expo-Konfiguration liegt in `frontend/app.json`.

Wichtige Einstellungen:

- App-Name: `frontend`
- Slug: `frontend`
- Version: `1.0.0`
- Orientation: `portrait`
- Scheme: `routenavigationapp`
- UI Style: `automatic`
- New Architecture: aktiviert
- iOS: Tablet-Support aktiviert
- Android: Adaptive Icons und Edge-to-Edge aktiviert
- Web: statischer Output, Favicon konfiguriert
- Expo Router Plugin aktiv
- Expo Splash Screen Plugin aktiv
- Experiments:
  - `typedRoutes: true`
  - `reactCompiler: true`

### Routing

Das Frontend verwendet Expo Router mit file-based routing.

Aktuelle Routen:

| Datei | Zweck |
| --- | --- |
| `frontend/app/_layout.tsx` | Root Stack Layout |
| `frontend/app/(tabs)/_layout.tsx` | Tab Navigation |
| `frontend/app/(tabs)/index.tsx` | Home Tab |
| `frontend/app/(tabs)/explore.tsx` | Explore Tab |
| `frontend/app/modal.tsx` | Modal Screen |

### Navigation

Die App nutzt:

- Stack-Navigation auf Root-Ebene
- Tab-Navigation fuer `Home` und `Explore`
- `HapticTab` als Tab-Bar-Button
- Icons ueber `IconSymbol`

### UI-Komponenten

Vorhandene Komponenten:

- `ThemedText`
- `ThemedView`
- `ParallaxScrollView`
- `HelloWave`
- `ExternalLink`
- `HapticTab`
- `Collapsible`
- `IconSymbol`

Diese Komponenten stammen groesstenteils aus dem Expo-Starter und bieten:

- Light-/Dark-Mode-Unterstuetzung
- Parallax Header
- Beispielanimation
- Plattform-spezifische Icons
- Collapsible Sections

### Aktueller UI-Stand

Die sichtbaren Screens sind noch Template-Screens:

- Home zeigt `Welcome!` und Expo-Starter-Hinweise.
- Explore erklaert Expo Router, Plattform-Support, Images, Color Themes und Animationen.
- Es gibt noch keine fachliche Route-Navigation-UI.
- Es gibt noch keine Verbindung vom Frontend zum Backend.
- Es gibt noch keine Login-/Register-Screens im Frontend.
- Es gibt noch keine Karten-/GPS-/Routing-Funktion im Frontend.

### Frontend Scripts

| Script | Befehl | Zweck |
| --- | --- | --- |
| `start` | `expo start` | Expo Dev Server starten |
| `reset-project` | `node ./scripts/reset-project.js` | Template zuruecksetzen |
| `android` | `expo start --android` | Android starten |
| `ios` | `expo start --ios` | iOS starten |
| `web` | `expo start --web` | Web starten |
| `lint` | `expo lint` | Linting |

## Datenbank und Docker

Die Datei `docker-compose.yml` definiert einen PostgreSQL-Service:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: route-navigation-postgres
    restart: unless-stopped
    ports:
      - "5433:5432"
```

Environment-Variablen aus `.env`:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Das Backend erwartet fuer Prisma ausserdem `DATABASE_URL`, weil `backend/prisma.config.ts` `env("DATABASE_URL")` verwendet.

Das Auth-Modul erwartet zusaetzlich:

- `JWT_SECRET`

Diese zwei Variablen sind in der Root-`.env` aktuell nicht sichtbar vorhanden.

## TypeScript-Konfiguration

### Backend

Backend `tsconfig.json`:

- Module-System: `nodenext`
- Target: `ES2023`
- Decorators: aktiviert
- Metadata fuer NestJS Decorators: aktiviert
- Source Maps: aktiviert
- Output: `dist`
- `strictNullChecks`: aktiviert
- `noImplicitAny`: deaktiviert
- `skipLibCheck`: aktiviert

### Frontend

Frontend `tsconfig.json`:

- erweitert `expo/tsconfig.base`
- `strict: true`
- Alias:

```json
"@/*": ["./*"]
```

Dieser Alias wird bereits in Komponenten und Screens verwendet.

## Linting und Formatierung

### Backend

Backend ESLint nutzt:

- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-prettier/recommended`
- Node- und Jest-Globals

Besondere Regeln:

- `@typescript-eslint/no-explicit-any`: aus
- `@typescript-eslint/no-floating-promises`: Warnung
- `@typescript-eslint/no-unsafe-argument`: Warnung
- Prettier `endOfLine: "auto"`

### Frontend

Frontend ESLint nutzt:

- `eslint-config-expo/flat`
- ignoriert `dist/*`

## Tests

### Backend

Vorhandene Testdateien:

- `backend/src/app.controller.spec.ts`
- `backend/src/auth/auth.controller.spec.ts`
- `backend/src/auth/auth.service.spec.ts`
- `backend/test/app.e2e-spec.ts`

Jest ist im Backend `package.json` konfiguriert:

- Test Regex: `.*\.spec\.ts$`
- Transform: `ts-jest`
- Test Environment: `node`
- Coverage Output: `coverage`

### Frontend

Im Frontend sind keine eigenen Test-Scripts oder Testdateien erkennbar. Es gibt aktuell nur Linting.

## Was bisher gemacht wurde

Aus Dateistand und Git-Historie ergibt sich dieser Fortschritt:

- Monorepo-Struktur mit `backend` und `frontend` angelegt.
- NestJS Backend initialisiert.
- Expo Frontend initialisiert.
- PostgreSQL Docker Compose Setup erstellt.
- Prisma eingerichtet.
- Datenbankmodelle `User` und `Route` definiert.
- Initiale Prisma Migration erstellt und SQL-Migration eingecheckt.
- Prisma Client in `backend/src/generated/prisma` generiert.
- PrismaModule und PrismaService erstellt.
- AuthModule, AuthController und AuthService erstellt.
- Registrierung mit E-Mail-Pruefung, bcrypt-Hashing und JWT-Ausgabe implementiert.
- Login mit Passwortvergleich und JWT-Ausgabe implementiert.
- DTOs fuer Register/Login mit Basisvalidierung angelegt.
- JWT Strategy und JWT Auth Guard wurden hinzugefuegt.
- ConfigModule ist global eingebunden.
- Backend-Scripts fuer Build, Start, Test, Lint und Prisma sind vorhanden.
- Frontend-Routing mit Expo Router und Tab-Layout ist vorhanden.
- Frontend besitzt Basis-Komponenten fuer Theming, Icons, Parallax Scroll und Collapsible UI.

Die letzten Git-Commits zeigen schwerpunktmaessig Backend-Auth-Arbeit:

```text
a331225 Build: Auth Controller
5da078f build: Login Service
8b8e67f .
98ab372 build: add Register Dub handling
fe8d7ff build: add Register Validation DTO
1ae4d7e build: Auth Service Core
bbcbca9 chore:init Auth Backend
e1d0e97 chore: Prisma Tables Migrated
```

## Aktuelle offene Punkte und Risiken

- `JWT_SECRET` wird im Backend benoetigt, ist aber in der gelesenen Root-`.env` nicht vorhanden.
- `DATABASE_URL` wird durch Prisma benoetigt, ist aber in der gelesenen Root-`.env` nicht vorhanden.
- Register-JWT enthaelt aktuell nur `username`, aber kein `sub`; die JWT Strategy erwartet jedoch `sub`.
- Fehlermeldungen im AuthService sind teilweise nicht produktionsreif und mehrsprachig gemischt.
- `register` nutzt bei existierender E-Mail eine informelle Fehlermeldung.
- `login` wirft bei nicht vorhandenem Benutzer eine `ConflictException`; fachlich waere meistens `UnauthorizedException` oder eine generische Login-Fehlermeldung ueblicher.
- DTO-Validierung prueft noch keine Passwortlaenge, Namenslaenge oder Normalisierung.
- Es gibt noch keine geschuetzten API-Routen, die `JwtAuthGuard` verwenden.
- Es gibt noch keine Route-Controller/Route-Service fuer das `Route` Modell.
- Frontend und Backend sind noch nicht verbunden.
- Frontend enthaelt noch keine fachlichen Screens fuer Login, Registrierung, Karte, Navigation oder Routenhistorie.
- Root `package.json`, Root `package-lock.json` und Root `pnpm-lock.yaml` existieren parallel zu separaten Backend-/Frontend-Lockfiles. Das sollte spaeter vereinheitlicht werden, damit Dependency Management klar bleibt.
- Backend verwendet pnpm, Frontend README beschreibt npm. Auch das sollte vereinheitlicht werden.

## Lokaler Betrieb

### Datenbank starten

```bash
docker compose up -d
```

Die Datenbank ist dann lokal ueber Port `5433` erreichbar.

### Backend vorbereiten

Im Ordner `backend/`:

```bash
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run start:dev
```

Erwartete Environment-Variablen:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5433/DB_NAME
JWT_SECRET=...
```

### Frontend starten

Im Ordner `frontend/`:

```bash
npm install
npm run start
```

Alternativ koennte das Projekt spaeter konsistent auf pnpm umgestellt werden.

## Empfohlene naechste Schritte

1. `.env.example` mit `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET` erstellen.
2. AuthService bereinigen: konsistente Fehlermeldungen, Register-Payload mit `sub`, generische Login-Fehler.
3. RouteController und RouteService fuer CRUD oder zumindest Speichern/Abrufen von Routen implementieren.
4. Geschuetzte Endpunkte mit `JwtAuthGuard` absichern.
5. Frontend-Template durch echte App-Screens ersetzen: Login, Register, Home/Karte, Route speichern, Routenhistorie.
6. API-Client im Frontend einrichten.
7. Einheitlichen Package Manager fuer Root, Backend und Frontend festlegen.
8. Tests fuer AuthService und spaeter RouteService erweitern.
9. README durch projektbezogene Setup-Dokumentation ersetzen.
