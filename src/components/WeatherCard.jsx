import React, { useEffect, useState } from 'react';

// Default location shown to citizens before/without geolocation permission.
// Matara is used as the reference point for the platform.
const DEFAULT_LOCATION = { name: 'Matara', district: 'Matara District', lat: 5.9485, lon: 80.5353 };

const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

// Maps Open-Meteo's WMO weather codes to a simplified condition used
// for both the label shown to citizens and which icon/color to render.
function classifyWeatherCode(code) {
  if (code === 0) return { label: 'Clear Sky', kind: 'sun' };
  if (code === 1 || code === 2) return { label: 'Partly Cloudy', kind: 'partly-cloudy' };
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' };
  if (code === 45 || code === 48) return { label: 'Foggy', kind: 'fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', kind: 'rain-light' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', kind: 'rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', kind: 'snow' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', kind: 'storm' };
  return { label: 'Unsettled', kind: 'cloudy' };
}

function WeatherIcon({ kind, size = 30 }) {
  const s = size;
  switch (kind) {
    case 'sun':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" fill="#F2B84B" />
          <g stroke="#F2B84B" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 1.5v3" /><path d="M12 19.5v3" />
            <path d="M4.2 4.2l2.1 2.1" /><path d="M17.7 17.7l2.1 2.1" />
            <path d="M1.5 12h3" /><path d="M19.5 12h3" />
            <path d="M4.2 19.8l2.1-2.1" /><path d="M17.7 6.3l2.1-2.1" />
          </g>
        </svg>
      );
    case 'partly-cloudy':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="9.5" cy="9.5" r="4.2" fill="#F2B84B" />
          <path d="M6 20a4.6 4.6 0 0 1-.4-9.2 5.8 5.8 0 0 1 11 1.3A4.3 4.3 0 0 1 16.2 20H6z" fill="#DAF1DE" stroke="#8EB69B" strokeWidth="1.1" />
        </svg>
      );
    case 'cloudy':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6.5 19a4.8 4.8 0 0 1-.4-9.6 6 6 0 0 1 11.5 1.4A4.4 4.4 0 0 1 17 19H6.5z" fill="#DAF1DE" stroke="#8EB69B" strokeWidth="1.1" />
        </svg>
      );
    case 'fog':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6.5 13.5a4.4 4.4 0 0 1-.3-8.8 5.6 5.6 0 0 1 10.8 1.3A4 4 0 0 1 17 13.5H6.5z" fill="#DAF1DE" stroke="#8EB69B" strokeWidth="1.1" />
          <g stroke="#8EB69B" strokeWidth="1.4" strokeLinecap="round">
            <path d="M4 17h16" /><path d="M6 20h12" />
          </g>
        </svg>
      );
    case 'rain-light':
    case 'rain':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6.5 13a4.6 4.6 0 0 1-.4-9.2A5.8 5.8 0 0 1 17 4.9 4.3 4.3 0 0 1 17 13H6.5z" fill="#DAF1DE" stroke="#8EB69B" strokeWidth="1.1" />
          <g stroke="#4A90D9" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 16.5l-1.3 3" /><path d="M12.5 16.5l-1.3 3" /><path d="M17 16.5l-1.3 3" />
          </g>
        </svg>
      );
    case 'snow':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6.5 13a4.6 4.6 0 0 1-.4-9.2A5.8 5.8 0 0 1 17 4.9 4.3 4.3 0 0 1 17 13H6.5z" fill="#DAF1DE" stroke="#8EB69B" strokeWidth="1.1" />
          <g stroke="#8EB69B" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 17v4" /><path d="M6.2 18.2l3.6 1.6" /><path d="M9.8 18.2l-3.6 1.6" />
            <path d="M16 17v4" /><path d="M14.2 18.2l3.6 1.6" /><path d="M17.8 18.2l-3.6 1.6" />
          </g>
        </svg>
      );
    case 'storm':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6.5 12.5a4.6 4.6 0 0 1-.4-9.2A5.8 5.8 0 0 1 17 4.2 4.3 4.3 0 0 1 17 12.5H6.5z" fill="#DAF1DE" stroke="#8EB69B" strokeWidth="1.1" />
          <path d="M13 14l-3.2 5h2.6L11 23l4.6-6.4h-2.7L13 14z" fill="#F2B84B" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#8EB69B" strokeWidth="1.4" />
        </svg>
      );
  }
}

function dayLabel(dateStr, index) {
  if (index === 0) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function WeatherCard() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [data, setData] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = (loc) => {
      const params = new URLSearchParams({
        latitude: loc.lat,
        longitude: loc.lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'Asia/Colombo',
        forecast_days: 5,
      });

      fetch(`${WEATHER_ENDPOINT}?${params.toString()}`)
        .then(res => {
          if (!res.ok) throw new Error('Weather request failed');
          return res.json();
        })
        .then(json => {
          if (cancelled) return;
          setData(json);
          setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    };

    // Best-effort geolocation so citizens see weather for where they are;
    // silently falls back to the default reference location otherwise.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (cancelled) return;
          const loc = {
            name: 'Your Location',
            district: '',
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          setLocation(loc);
          fetchWeather(loc);
        },
        () => fetchWeather(DEFAULT_LOCATION),
        { timeout: 4000 }
      );
    } else {
      fetchWeather(DEFAULT_LOCATION);
    }

    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="weather-card card-surface">
        <div className="weather-card-loading">Loading forecast…</div>
      </div>
    );
  }

  if (status === 'error' || !data?.current) {
    return (
      <div className="weather-card card-surface">
        <div className="weather-card-head">
          <div>
            <span>Weather</span>
            <h3>Forecast Unavailable</h3>
          </div>
        </div>
        <div className="weather-card-error">
          <p>Unable to load the latest forecast right now. Please check back shortly.</p>
        </div>
      </div>
    );
  }

  const current = classifyWeatherCode(data.current.weather_code);
  const temp = Math.round(data.current.temperature_2m);
  const feelsLike = Math.round(data.current.apparent_temperature);
  const humidity = Math.round(data.current.relative_humidity_2m);
  const wind = Math.round(data.current.wind_speed_10m);
  const rainToday = data.daily?.precipitation_probability_max?.[0] ?? 0;

  const upcoming = (data.daily?.time || []).slice(1, 5).map((date, i) => {
    const idx = i + 1;
    const cond = classifyWeatherCode(data.daily.weather_code[idx]);
    return {
      date,
      label: dayLabel(date, idx),
      kind: cond.kind,
      max: Math.round(data.daily.temperature_2m_max[idx]),
      min: Math.round(data.daily.temperature_2m_min[idx]),
    };
  });

  return (
    <div className="weather-card card-surface">
      <div className="weather-card-head">
        <div>
          <span>{location.name}{location.district ? ` · ${location.district}` : ''}</span>
          <h3>Weather Forecast</h3>
        </div>
        <span className="live-dot-label"><i /> LIVE</span>
      </div>

      <div className="weather-current">
        <WeatherIcon kind={current.kind} size={54} />
        <div className="weather-current-temp">
          <strong>{temp}°</strong>
          <span>{current.label}</span>
        </div>
      </div>

      <div className="weather-stat-grid">
        <div>
          <span>Feels Like</span>
          <strong>{feelsLike}°</strong>
        </div>
        <div>
          <span>Humidity</span>
          <strong>{humidity}%</strong>
        </div>
        <div>
          <span>Wind</span>
          <strong>{wind} km/h</strong>
        </div>
        <div>
          <span>Rain Chance</span>
          <strong>{rainToday}%</strong>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="weather-forecast-strip">
          {upcoming.map(day => (
            <div key={day.date} className="weather-forecast-day">
              <span>{day.label}</span>
              <WeatherIcon kind={day.kind} size={24} />
              <div className="weather-forecast-range">
                <strong>{day.max}°</strong>
                <span>{day.min}°</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
