import { useEffect, useState } from 'react'
import { fetchTodayWeather } from '../lib/weather'

// Silently renders nothing if location isn't available/granted — this is a
// nice-to-have, never worth a loading spinner or an error message.
export default function WeatherBadge() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchTodayWeather().then((w) => {
      if (!cancelled) setWeather(w)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!weather) return null

  return (
    <span className="flex items-center gap-1 text-sm text-slate-300">
      <span>{weather.emoji}</span>
      <span className="tabular-nums">{weather.temp}°</span>
    </span>
  )
}
