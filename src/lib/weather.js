// Open-Meteo: free, keyless, CORS-friendly — called directly from the
// client, no serverless proxy needed. Coordinates come from the browser's
// own Geolocation API (asked once; a decline is remembered so we don't nag).
const COORDS_KEY = 'ai-time-manager-geo'
const GEO_DECLINED_KEY = 'ai-time-manager-geo-declined'
const GEO_TIMEOUT_MS = 8000

// WMO weather codes -> a single representative emoji, grouped loosely by
// how they'd actually change your day (clear/cloudy/rain/snow/storm).
const CODE_EMOJI = [
  { max: 1, emoji: '☀️' },
  { max: 3, emoji: '⛅' },
  { max: 48, emoji: '🌫️' },
  { max: 57, emoji: '🌦️' },
  { max: 67, emoji: '🌧️' },
  { max: 77, emoji: '🌨️' },
  { max: 82, emoji: '🌧️' },
  { max: 86, emoji: '🌨️' },
  { max: 99, emoji: '⛈️' }
]

function emojiForCode(code) {
  return (CODE_EMOJI.find((c) => code <= c.max) || CODE_EMOJI[1]).emoji
}

function getCachedCoords() {
  try {
    return JSON.parse(localStorage.getItem(COORDS_KEY) || 'null')
  } catch {
    return null
  }
}

function requestCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    if (localStorage.getItem(GEO_DECLINED_KEY)) return resolve(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        localStorage.setItem(COORDS_KEY, JSON.stringify(coords))
        resolve(coords)
      },
      () => {
        localStorage.setItem(GEO_DECLINED_KEY, '1')
        resolve(null)
      },
      { timeout: GEO_TIMEOUT_MS, maximumAge: 24 * 60 * 60 * 1000 }
    )
  })
}

// Best-effort — returns null on any failure (no permission, offline, API
// hiccup) so the caller can just render nothing instead of an error state.
export async function fetchTodayWeather() {
  const coords = getCachedCoords() || (await requestCoords())
  if (!coords) return null

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const temp = data.current?.temperature_2m
    const code = data.current?.weather_code
    if (temp == null || code == null) return null
    return { temp: Math.round(temp), emoji: emojiForCode(code) }
  } catch {
    return null
  }
}
