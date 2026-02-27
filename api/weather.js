const buildUrl = (apiKey, { q, lat, lon }) => {
  const base = new URL('https://api.openweathermap.org/data/2.5/weather')
  if (lat && lon) {
    base.searchParams.set('lat', lat)
    base.searchParams.set('lon', lon)
  } else if (q) {
    base.searchParams.set('q', q)
  } else {
    return null
  }
  base.searchParams.set('units', 'metric')
  base.searchParams.set('appid', apiKey)
  return base
}

export default async function handler(req, res) {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'OPENWEATHER_API_KEY not configured on server.' })
  }

  const { q, lat, lon } = req.query || {}
  const url = buildUrl(apiKey, {
    q: q ? String(q) : '',
    lat: lat ? String(lat) : '',
    lon: lon ? String(lon) : '',
  })

  if (!url) {
    return res.status(400).json({ error: 'Missing query or coordinates.' })
  }

  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    const data = await response.json()

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data?.message || 'Failed to fetch weather data.' })
    }

    const payload = {
      id: data.id,
      name: data.name,
      country: data.sys?.country,
      coordinates: data.coord,
      weather: {
        main: data.weather?.[0]?.main,
        description: data.weather?.[0]?.description,
        icon: data.weather?.[0]?.icon,
      },
      temperature: {
        current: data.main?.temp,
        feelsLike: data.main?.feels_like,
        min: data.main?.temp_min,
        max: data.main?.temp_max,
      },
      humidity: data.main?.humidity,
      wind: {
        speed: data.wind?.speed,
      },
      clouds: data.clouds?.all,
      timestamp: data.dt * 1000,
    }

    return res.status(200).json(payload)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch weather data.' })
  }
}

