## Falko Backend

Serwer backendowy projektu Falko oparty o Medusa (core commerce) + autorskie moduły i integracje.

### Funkcjonalności
- Produkty, zamówienia, płatności (Medusa core + rozszerzenia)
- Integracja PayNow
- Integracja Furgonetka (OAuth, punkty, generowanie etykiet)
- Zwroty (custom flow)
- Lojalność (tymczasowo wyłączona – część endpointów i migracji usunięta)
- E‑maile transakcyjne (subscribers + service)

### Struktura (skrót)
```
src/
  api/            # Handlers (admin/store) + integracje
  services/       # Logika domenowa
  subscribers/    # Event-driven akcje
  plugins/        # Pluginy (np. medusa-furgonetka-elements)
  migrations/     # Migracje bazy
  middleware/     # Własne middleware (remember-me itp.)
integration-tests/
scripts/          # Seed, introspekcja, narzędzia
static/           # Assety
```

### Wymagania
- Node.js LTS
- PostgreSQL
- Redis (jeżeli używane kolejki/cache)

### Uruchomienie (dev)
```bash
npm install
npm run dev
```

### Konfiguracja środowiska
Użyj plików: `.env.template` lub `.env.production.template` jako baz. Plik `.env` jest ignorowany (sekrety lokalne).

### Deploy
- `Dockerfile` – build produkcyjny
- `fly.toml` / `fly.worker.toml` – przykłady konfiguracji Fly.io
- Railway / inne: patrz dokument `Deploy Medusa Application to Railway.md`

### CI/CD
Workflows (`.github/workflows/`): testy, aktualizacje zależności pod preview.

### Konwencje kodu
Commity: Conventional Commits. Branch główny: `main`.

### Licencja
Wewnętrzna / prywatna.

---
Oryginalny README startera Medusa przeniesiony został do `OLD_README_MEDUSA.md`.
