# Cirrus Weather (MERN)

Minimal, SaaS-style real-time weather app.

## Project structure

- `server/`: Express API (proxies OpenWeather; optional MongoDB for recent locations)
- `weather-ui/`: Vite + React frontend

## Run locally

### 1) Backend

Create `server/.env`:

```env
OPENWEATHER_API_KEY=your_openweather_api_key_here
MONGO_URI=
```

Start the server:

```bash
cd server
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Frontend

```bash
cd weather-ui
npm install
npm run dev
```

Frontend runs on the URL Vite prints (usually `http://localhost:5173`).

## Deploy to Vercel (frontend)

When importing the repo into Vercel:

- **Root Directory**: `weather-ui`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Note: Vite 7 requires Node 20.19+ (or Node 22+). On Vercel, set Node.js to 22 if needed.

