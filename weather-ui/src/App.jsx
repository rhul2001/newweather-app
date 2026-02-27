import { useEffect, useState } from 'react'
import './App.css'

const initialState = {
  query: '',
  loading: false,
  error: '',
  current: null,
  recentLocations: [],
}

function App() {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    fetchRecentLocations()
  }, [])

  const fetchRecentLocations = async () => {
    try {
      const res = await fetch('/api/locations/recent')
      if (!res.ok) throw new Error('Failed to load recent locations')
      const data = await res.json()
      setState((prev) => ({ ...prev, recentLocations: data }))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchWeather = async ({ q, lat, lon }) => {
    setState((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (lat && lon) {
        params.set('lat', lat)
        params.set('lon', lon)
      }
      const res = await fetch(`/api/weather?${params.toString()}`)

      const contentType = res.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const body = isJson ? await res.json() : await res.text()

      if (!res.ok) {
        const serverMessage =
          isJson && body && typeof body === 'object' ? body.error : ''
        const hint =
          !isJson
            ? `API returned non-JSON (status ${res.status}). This usually means /api is not deployed or is being rewritten.`
            : ''
        throw new Error(serverMessage || hint || 'Failed to fetch weather')
      }
      setState((prev) => ({
        ...prev,
        current: body,
        loading: false,
        error: '',
      }))
      fetchRecentLocations()
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Something went wrong',
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!state.query.trim()) return
    fetchWeather({ q: state.query.trim() })
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported in this browser.',
      }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        fetchWeather({ lat: latitude, lon: longitude })
      },
      () => {
        setState((prev) => ({
          ...prev,
          error: 'Unable to access your location.',
        }))
      }
    )
  }

  const { query, loading, error, current, recentLocations } = state

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Cirrus Weather</span>
        </div>
        <div className="header-right">
          <span className="badge">LIVE</span>
        </div>
      </header>

      <main className="app-main">
        <section className="hero">
          <div className="hero-copy">
            <h1>Weather, distilled.</h1>
            <p>
              Minimal, real-time weather for teams that care about clarity.
              Search any city or use your live location.
            </p>
            <form className="search-form" onSubmit={handleSubmit}>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search by city, e.g. London"
                  value={query}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, query: e.target.value }))
                  }
                />
                {query && (
                  <button
                    type="button"
                    className="ghost-icon"
                    onClick={() =>
                      setState((prev) => ({ ...prev, query: '' }))
                    }
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="search-actions">
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Fetching...' : 'Check weather'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleUseLocation}
                  disabled={loading}
                >
                  Use my location
                </button>
              </div>
            </form>
            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="hero-panel">
            {current ? (
              <div className="weather-card">
                <div className="weather-header">
                  <div>
                    <h2>
                      {current.name}{' '}
                      {current.country && (
                        <span className="subtle">· {current.country}</span>
                      )}
                    </h2>
                    <p className="timestamp">
                      Updated{' '}
                      {new Date(current.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="temp-main">
                    <span className="temp-value">
                      {Math.round(current.temperature.current)}°
                    </span>
                    <span className="temp-meta">
                      {current.weather.main}
                      <span className="temp-range">
                        H {Math.round(current.temperature.max)}° · L{' '}
                        {Math.round(current.temperature.min)}°
                      </span>
                    </span>
                  </div>
                </div>
                <div className="weather-grid">
                  <div className="metric">
                    <span className="label">Feels like</span>
                    <span className="value">
                      {Math.round(current.temperature.feelsLike)}°
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Humidity</span>
                    <span className="value">{current.humidity}%</span>
                  </div>
                  <div className="metric">
                    <span className="label">Wind</span>
                    <span className="value">{current.wind.speed} m/s</span>
                  </div>
                  <div className="metric">
                    <span className="label">Clouds</span>
                    <span className="value">{current.clouds}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="weather-empty">
                <h2>No location selected</h2>
                <p>Start with a city or use your live location.</p>
              </div>
            )}

            <div className="recent-panel">
              <div className="recent-header">
                <span>Recent locations</span>
              </div>
              {recentLocations.length === 0 ? (
                <p className="muted">No history yet. Your last 5 cities appear here.</p>
              ) : (
                <ul className="recent-list">
                  {recentLocations.map((loc) => (
                    <li key={loc.id}>
                      <button
                        type="button"
                        onClick={() =>
                          fetchWeather({
                            q: `${loc.name},${loc.country}`,
                          })
                        }
                      >
                        <span className="recent-name">
                          {loc.name}{' '}
                          <span className="subtle">· {loc.country}</span>
                        </span>
                        <span className="recent-meta">
                          {new Date(loc.lastViewedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>Powered by OpenWeather · Cirrus Weather</span>
      </footer>
    </div>
  )
}

export default App
