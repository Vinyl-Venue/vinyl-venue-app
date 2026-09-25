import { useState } from 'react'
import Papa from 'papaparse'

const FIELD_OPTIONS = [
  { value: '', label: '-- Skip this column --' },
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'year', label: 'Year' },
  { value: 'genre', label: 'Genre' },
  { value: 'label', label: 'Label' },
  { value: 'pressingCountry', label: 'Pressing country' }
]

function ImportCsvModal({ onImport, onUpdate, onClose }) {
  const [rows, setRows] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [isUpdateMode, setIsUpdateMode] = useState(false)
  const [importing, setImporting] = useState(false)
  const [resultSummary, setResultSummary] = useState(null)

  function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        applyParsedData(results.meta.fields, results.data)
      }
    })
  }

  function applyParsedData(fields, data) {
    setHeaders(fields)
    setRows(data)
    setResultSummary(null)

    // Export Shelf always includes an "id" column — nothing else in the
    // normal add-new flow would have a column literally named that, so
    // its presence is a reliable signal this file came from Vinyl Venue's
    // own export rather than some other collection-tracking tool. If a
    // hand-crafted CSV happens to include an "id" column with values that
    // don't correspond to real album ids, those rows just get skipped and
    // counted at update time (see handleUpdateFromCsv) rather than
    // silently corrupting anything.
    if (fields.includes('id')) {
      setIsUpdateMode(true)
      return
    }

    setIsUpdateMode(false)
    const guessedMapping = {}
    fields.forEach((header) => {
      const lower = header.toLowerCase()
      if (lower.includes('title') || lower.includes('album')) guessedMapping[header] = 'title'
      else if (lower.includes('artist') || lower.includes('band')) guessedMapping[header] = 'artist'
      else if (lower.includes('year')) guessedMapping[header] = 'year'
      else if (lower.includes('genre') || lower.includes('style')) guessedMapping[header] = 'genre'
      else if (lower.includes('label')) guessedMapping[header] = 'label'
      else if (lower.includes('country')) guessedMapping[header] = 'pressingCountry'
    })
    setMapping(guessedMapping)
  }

  function handleMappingChange(header, field) {
    setMapping({ ...mapping, [header]: field })
  }

  async function handleImport() {
    setImporting(true)

    const mappedField = (row, fieldName) => {
      const header = Object.keys(mapping).find((h) => mapping[h] === fieldName)
      return header ? row[header] : ''
    }

    const albumsToImport = rows
      .map((row) => ({
        title: mappedField(row, 'title'),
        artist: mappedField(row, 'artist'),
        year: mappedField(row, 'year') ? Number(mappedField(row, 'year')) : null,
        genre: mappedField(row, 'genre') || '',
        label: mappedField(row, 'label') || '',
        pressingCountry: mappedField(row, 'pressingCountry') || ''
      }))
      .filter((album) => album.title && album.artist)

    await onImport(albumsToImport)

    setResultSummary({ type: 'import', count: albumsToImport.length })
    setImporting(false)
  }

  async function handleUpdate() {
    setImporting(true)
    const summary = await onUpdate(rows)
    setResultSummary({ type: 'update', ...summary })
    setImporting(false)
  }

  function handleChooseDifferentFile() {
    setRows(null)
    setHeaders([])
    setMapping({})
    setIsUpdateMode(false)
    setResultSummary(null)
  }

  const isTitleMapped = Object.values(mapping).includes('title')
  const isArtistMapped = Object.values(mapping).includes('artist')

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg p-6 max-w-lg w-11/12 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 bg-transparent border-0 text-text-muted text-2xl cursor-pointer">×</button>
        <h2 className="text-2xl m-0 mb-4">{isUpdateMode && rows ? 'Update from Export' : 'Import from CSV'}</h2>

        {resultSummary !== null ? (
          <div className="font-sans text-sm text-center">
            {resultSummary.type === 'import' ? (
              <p className="text-accent">
                Imported {resultSummary.count} album{resultSummary.count === 1 ? '' : 's'}!
              </p>
            ) : (
              <>
                <p className="text-accent mb-1">
                  Updated {resultSummary.updated} album{resultSummary.updated === 1 ? '' : 's'}.
                </p>
                {resultSummary.listingsChanged > 0 && (
                  <p className="text-text-muted mb-1">
                    {resultSummary.listingsChanged} listing{resultSummary.listingsChanged === 1 ? '' : 's'} created, updated, or cancelled.
                  </p>
                )}
                {resultSummary.skipped > 0 && (
                  <p className="text-[#d97757]">
                    {resultSummary.skipped} row{resultSummary.skipped === 1 ? '' : 's'} skipped — no matching album id found.
                  </p>
                )}
              </>
            )}
          </div>
        ) : !rows ? (
          <>
            <p className="text-text-muted font-sans text-sm mb-3">
              Upload a CSV — either a file exported from Vinyl Venue (to bulk-update
              condition, listing status, price, etc.) or any other CSV to add new albums.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="text-text-muted font-sans text-sm"
            />
          </>
        ) : isUpdateMode ? (
          <>
            <p className="text-text-muted font-sans text-sm mb-3">
              This looks like a file exported from Vinyl Venue — found {rows.length} row{rows.length === 1 ? '' : 's'}.
              Each row updates the matching album's details and listing status/price. Rows
              without a valid, matching id are skipped rather than added as new albums.
            </p>
            <button
              onClick={handleUpdate}
              disabled={importing}
              className="w-full bg-accent text-bg border-0 px-4 py-2 rounded font-sans text-sm cursor-pointer disabled:opacity-50 mb-2"
            >
              {importing ? 'Updating...' : `Update ${rows.length} row${rows.length === 1 ? '' : 's'}`}
            </button>
            <button
              onClick={handleChooseDifferentFile}
              disabled={importing}
              className="w-full bg-transparent border border-border text-text-muted px-4 py-2 rounded font-sans text-sm cursor-pointer"
            >
              Choose different file
            </button>
          </>
        ) : (
          <>
            <p className="text-text-muted font-sans text-sm mb-3">
              Found {rows.length} rows. Match each column to a field (or skip it):
            </p>
            <div className="my-4 max-h-72 overflow-y-auto flex flex-col gap-2">
              {headers.map((header) => (
                <div key={header} className="flex justify-between items-center gap-3">
                  <span className="font-sans text-sm text-text flex-1">{header}</span>
                  <select
                    value={mapping[header] || ''}
                    onChange={(event) => handleMappingChange(header, event.target.value)}
                    className="bg-bg border border-border text-text px-2.5 py-1.5 rounded font-sans text-sm"
                  >
                    {FIELD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {(!isTitleMapped || !isArtistMapped) && (
              <p className="text-[#d97757] text-sm m-0 mb-3">Please map at least Title and Artist before importing.</p>
            )}
            <button
              onClick={handleImport}
              disabled={!isTitleMapped || !isArtistMapped || importing}
              className="w-full bg-accent text-bg border-0 px-4 py-2 rounded font-sans text-sm cursor-pointer disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${rows.length} albums`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ImportCsvModal