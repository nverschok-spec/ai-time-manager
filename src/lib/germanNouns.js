// Article/plural lookup from a static noun list (german-nouns by gambolputty,
// built from WiktionaryDE, CC BY-SA) — no API, no guessing. ~2.8 MB, so it is
// fetched on demand (only when words are imported) instead of being bundled
// or precached into the PWA. Shape: { [lemma.toLowerCase()]: [genus, plural?] }.
const GENUS_TO_ARTICLE = { m: 'der', f: 'die', n: 'das' }

let datasetPromise = null

export function loadNouns() {
  if (!datasetPromise) {
    datasetPromise = fetch('/data/german-nouns.json')
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        if (!Object.keys(data).length) datasetPromise = null // let a later import retry
        return data
      })
  }
  return datasetPromise
}

// Sync lookup against an already-loaded dataset. Only capitalised words are
// nouns in German, so "bewerben" / "trotzdem" are never looked up (a
// lowercase "tisch" typed by hand is left alone rather than guessed).
export function makeNounLookup(dataset) {
  return (lemma) => {
    if (!/^[A-ZÄÖÜ]/.test(lemma)) return null
    const entry = dataset[lemma.trim().toLowerCase()]
    if (!entry) return null
    const [genus, plural] = entry
    return { article: GENUS_TO_ARTICLE[genus] ?? null, plural: plural ?? '' }
  }
}
