# CyberShakti

🔗 **Live Demo:** [https://cyber-shakti-alpha.vercel.app/](https://cyber-shakti-alpha.vercel.app/)

A modern, production-ready web app to help users stay safe online. CyberShakti brings real-time protection concepts like scam call blocking, phishing link scanning, fraud message detection, fake profile verification, deepfake detection UI, daily safety tips, and location-based scam alerts.

## Features

- Scam call blocking (concept UI)
- Phishing link scanner (heuristic risk scoring)
- Fraud message detector (text heuristics)
- Fake profile verification (concept)
- Deepfake detection (upload UI preview)
- Daily cyber safety tips
- **Location-based scam alerts** (interactive map with MySQL backend)
- Beautiful dark theme, responsive layout, tasteful animations (framer‑motion + Tailwind keyframes)

> Important: The scanners are heuristic demos for educational purposes and are NOT a substitute for professional security tools.

## Tech Stack

- React 18 + TypeScript + Vite 7
- React Router 6 (SPA)
- TailwindCSS 3 + shadcn/ui primitives + Lucide icons
- Framer Motion for animations
- Express (integrated for API when needed)
- Python Flask (AI backend for deepfake detection)
- MySQL 8 (location-based scam alerts)
- Leaflet.js (interactive maps)
- Vitest for tests

## Project Structure

```
client/        # React SPA
  pages/       # Routes (Index = home, plus below)
    Index.tsx  # Animated hero + feature highlights
    Features.tsx
    Scanner.tsx
    Tips.tsx
    Alerts.tsx
  components/  # UI primitives & layout (SiteHeader, SiteFooter)
server/        # Express server (Node.js backend)
  python-bridge.ts  # Manages Flask server lifecycle
  routes/      # API routes
  config.ts    # Configuration management
python/        # Flask server (Python AI backend)
  api_server.py  # Deepfake detection API
shared/        # Types shared between client/server
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.8+ (for deepfake detection features)
- MySQL 8.0+ (for location-based scam alerts)

### Installation

1. Install Node.js dependencies

```bash
pnpm install
```

If your environment enforces frozen lockfiles and install fails, run:

```bash
pnpm install --no-frozen-lockfile
```

2. Set up Python environment (for deepfake detection)

```bash
cd python
pip install -r requirements.txt
cd ..
```

> **Note:** If you don't have Python installed or don't need deepfake detection features, you can skip this step. The Express server will continue running without Flask integration, and deepfake endpoints will return 503 errors.

3. Set up MySQL database (for location-based scam alerts)

**Windows:**
```bash
setup-database.bat
```

**Linux/macOS:**
```bash
mysql -u root -p < database/schema.sql
```

See [SCAM_ALERTS_SETUP.md](SCAM_ALERTS_SETUP.md) for detailed setup instructions.

> **Note:** If you don't have MySQL installed or don't need scam alerts, you can skip this step. The scam alerts feature will not work, but the rest of the app will function normally.

4. Configure environment variables (optional)

Copy `.env.example` to `.env` and customize if needed:

```bash
cp .env.example .env
```

Available Flask configuration options:
- `FLASK_PORT` - Flask server port (default: 5001)
- `FLASK_HOST` - Flask server host (default: 0.0.0.0)
- `FLASK_HEALTH_TIMEOUT` - Health check timeout in ms (default: 10000)
- `FLASK_HEALTH_INTERVAL` - Health check interval in ms (default: 500)
- `FLASK_HEALTH_MAX_RETRIES` - Max health check retries (default: 20)
- `FLASK_SHUTDOWN_TIMEOUT` - Shutdown timeout in ms (default: 5000)
- `NODE_ENV` - Environment mode (development/production)

MySQL database configuration:
- `DB_HOST` - MySQL host (default: localhost)
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - MySQL username (default: root)
- `DB_PASSWORD` - MySQL password (required)
- `DB_NAME` - Database name (default: cybershakti)

### Development

Start the development server (starts both Express and Flask):

```bash
pnpm dev
```

The app runs at http://localhost:8080

- Frontend: Vite dev server with hot reload
- Express API: http://localhost:8080/api
- Deepfake API: http://localhost:8080/api/deepfake (proxied to Flask)

The Flask server is automatically started and managed by the Express server. You'll see startup logs for both servers in the console.

### Production Build

Build for production:

```bash
pnpm build
```

Run production build locally:

```bash
pnpm start
```

### Testing

Run tests and typechecks:

```bash
pnpm test
pnpm typecheck
```

## Routes

- `/` — Homepage (animated hero, highlights)
- `/features` — All features grid
- `/scanner` — Phishing URL scanner + fraud message detector
- `/tips` — Daily safety tips
- `/alerts` — Location-based scam alerts (uses browser geolocation)
- `/scam-alerts` — Interactive scam alert map with reporting (requires MySQL)

## Theming

Tailwind uses HSL CSS variables defined in `client/global.css`. Colors are tuned for a cyber theme (teal/emerald primary, aqua accents). Update variables there to change the brand.

## Deployment

You can deploy to:

- Netlify
- Vercel

Typical steps:

```
pnpm install
pnpm build
```

Deploy the `dist/` output using your provider. Both providers can detect a Vite + SPA build automatically.

## Troubleshooting

### General Issues

- Lockfile mismatch in CI: `pnpm install --no-frozen-lockfile`
- Port conflicts: update dev server port in Vite config or run with a different port env
- Geolocation blocked: ensure site is served over HTTPS or allow permission in the browser

### Python Backend Issues

**Flask server fails to start:**

1. **Python not found:**
   - Ensure Python 3.8+ is installed and in your system PATH
   - On Windows: Use `python` command
   - On Linux/macOS: Use `python3` command
   - Verify: `python --version` or `python3 --version`

2. **Missing Python dependencies:**
   ```bash
   cd python
   pip install -r requirements.txt
   ```

3. **Port already in use:**
   - Check if another process is using port 5001
   - Set a different port in `.env`: `FLASK_PORT=5002`
   - On Linux/macOS: `lsof -i :5001`
   - On Windows: `netstat -ano | findstr :5001`

4. **Flask health check timeout:**
   - Increase timeout in `.env`: `FLASK_HEALTH_TIMEOUT=20000`
   - Check Flask logs in the console for startup errors
   - Try manually starting Flask: `cd python && python api_server.py`

**Deepfake endpoints return 503:**

This means the Flask server is not running. Check the console logs for Flask startup errors. The Express server will continue running normally, but deepfake detection features will be unavailable.

**Running without Python:**

If you don't need deepfake detection features, you can run the app without Python installed. The Express server will start normally and log a warning about Flask being unavailable.

### MySQL Database Issues

**Database connection errors:**

1. **MySQL not running:**
   - Windows: Check Services for "MySQL" service
   - Linux: `sudo service mysql status`
   - macOS: `brew services list`

2. **Wrong credentials:**
   - Verify `DB_PASSWORD` in `.env` matches your MySQL root password
   - Test connection: `mysql -u root -p`

3. **Database doesn't exist:**
   - Run setup script: `setup-database.bat` (Windows) or `mysql -u root -p < database/schema.sql` (Linux/macOS)
   - Verify: `mysql -u root -p -e "SHOW DATABASES;"`

4. **Missing tables:**
   - Re-run schema: `mysql -u root -p cybershakti < database/schema.sql`
   - Verify: `mysql -u root -p -e "USE cybershakti; SHOW TABLES;"`

**Scam alerts page not working:**

- Check browser console for API errors
- Verify database connection in server logs
- Ensure location permissions are enabled in browser
- See [SCAM_ALERTS_SETUP.md](SCAM_ALERTS_SETUP.md) for detailed troubleshooting

## Security Note

CyberShakti is an educational demo. Do not rely on its heuristics for critical decisions. Always verify links, messages, and files with trusted sources and tools.
