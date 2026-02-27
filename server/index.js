const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI || '';
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
    });
} else {
  console.warn('MONGO_URI not set. MongoDB is not connected.');
}

const WeatherLocationSchema = new mongoose.Schema(
  {
    name: String,
    country: String,
    lat: Number,
    lon: Number,
    lastViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WeatherLocation =
  mongoose.models.WeatherLocation ||
  mongoose.model('WeatherLocation', WeatherLocationSchema);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/weather', async (req, res) => {
  const { q, lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'OPENWEATHER_API_KEY not configured on server.' });
  }

  try {
    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(
        lon
      )}&units=metric&appid=${encodeURIComponent(apiKey)}`;
    } else if (q) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        q
      )}&units=metric&appid=${encodeURIComponent(apiKey)}`;
    } else {
      return res.status(400).json({ error: 'Missing query or coordinates.' });
    }

    const response = await axios.get(url);
    const data = response.data;

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
    };

    if (mongoUri && data.name && data.sys?.country) {
      try {
        await WeatherLocation.findOneAndUpdate(
          { name: data.name, country: data.sys.country },
          {
            name: data.name,
            country: data.sys.country,
            lat: data.coord?.lat,
            lon: data.coord?.lon,
            lastViewedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('Failed to upsert WeatherLocation:', err.message);
      }
    }

    res.json(payload);
  } catch (err) {
    console.error('Weather API error:', err.message);
    const status = err.response?.status || 500;
    const message =
      err.response?.data?.message || 'Failed to fetch weather data.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/locations/recent', async (req, res) => {
  if (!mongoUri) {
    return res.json([]);
  }

  try {
    const recent = await WeatherLocation.find({})
      .sort({ lastViewedAt: -1 })
      .limit(5)
      .lean();
    res.json(
      recent.map((loc) => ({
        id: loc._id,
        name: loc.name,
        country: loc.country,
        lat: loc.lat,
        lon: loc.lon,
        lastViewedAt: loc.lastViewedAt,
      }))
    );
  } catch (err) {
    console.error('Error fetching recent locations:', err.message);
    res.status(500).json({ error: 'Failed to fetch recent locations.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

