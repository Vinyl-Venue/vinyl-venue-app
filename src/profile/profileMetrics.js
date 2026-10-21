// Pure helpers that turn a shelf into the numbers the metrics page shows.
// Every album counts, duplicates included — "Albums" is the total number of
// copies on the shelf.

function bump(map, key) {
  map[key] = (map[key] || 0) + 1
}

function sortedEntries(map, limit) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  return limit ? entries.slice(0, limit) : entries
}

export function computeShelfMetrics(albums) {
  const total = albums.length

  const titleKeys = new Set()
  const genres = {}
  const decades = {}
  const conditions = {}
  const byMonth = {}

  for (const a of albums) {
    titleKeys.add(`${(a.title || '').trim().toLowerCase()}|${(a.artist || '').trim().toLowerCase()}`)
    bump(genres, a.genre || 'Unknown')

    const year = Number(a.year)
    if (year >= 1900 && year <= 2100) bump(decades, `${Math.floor(year / 10) * 10}s`)

    // Grade the record by its media condition, falling back to the sleeve.
    const grade = a.mediaCondition || a.sleeveCondition
    if (grade) bump(conditions, grade)

    if (a.createdAt) bump(byMonth, String(a.createdAt).slice(0, 7))
  }

  const uniqueTitles = titleKeys.size

  // Cumulative growth, month by month, oldest first.
  const months = Object.keys(byMonth).sort()
  let running = 0
  const growth = months.map((month) => {
    running += byMonth[month]
    return { month, total: running }
  })

  const rarest = albums
    .filter((a) => a.rarityRank)
    .sort((a, b) => a.rarityRank - b.rarityRank)

  return {
    total,
    uniqueTitles,
    duplicates: total - uniqueTitles,
    genreCount: Object.keys(genres).length,
    genres: sortedEntries(genres, 8),
    decades: Object.entries(decades).sort((a, b) => a[0].localeCompare(b[0])),
    conditions: sortedEntries(conditions),
    growth,
    rarest
  }
}

// "2024-03" -> "Mar 2024"
export function formatMonth(month) {
  const [year, m] = month.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m) - 1]} ${year}`
}
