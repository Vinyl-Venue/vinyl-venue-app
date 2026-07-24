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

function ImportCsvModal({ onImport, onClose }) {
  const [rows, setRows] = useState(null)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(null)

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

    setImportedCount(albumsToImport.length)
    setImporting(false)
  }

  const isTitleMapped = Object.values(mapping).includes('title')
  const isArtistMapped = Object.values(mapping).includes('artist')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Import from CSV</h2>

        {importedCount !== null ? (
          <p className="listing-success">
            Imported {importedCount} album{importedCount === 1 ? '' : 's'}!
          </p>
        ) : !rows ? (
          <>
            <p className="wishlist-subtitle">
              Upload a CSV file — you'll match its columns to Vinyl Venue's fields next.
            </p>
            <input type="file" accept=".csv" onChange={handleFileSelect} className="file-input" />
          </>
        ) : (
          <>
            <p className="wishlist-subtitle">
              Found {rows.length} rows. Match each column to a field (or skip it):
            </p>
            <div className="import-mapping-list">
              {headers.map((header) => (
                <div key={header} className="import-mapping-row">
                  <span className="import-header-name">{header}</span>
                  <select
                    value={mapping[header] || ''}
                    onChange={(event) => handleMappingChange(header, event.target.value)}
                  >
                    {FIELD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {(!isTitleMapped || !isArtistMapped) && (
              <p className="auth-error">Please map at least Title and Artist before importing.</p>
            )}
            <button
              className="list-for-sale-button"
              onClick={handleImport}
              disabled={!isTitleMapped || !isArtistMapped || importing}
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