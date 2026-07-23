import { useState, useEffect } from 'react'
import AutocompleteInput from './AutocompleteInput'

function AddAlbumForm({
  onAddAlbum,
  onUpdateAlbum,
  editingAlbum,
  onCancelEdit,
  existingTitles,
  existingArtists,
  existingGenres,
  existingLabels,
  existingPressingCountries
}) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [year, setYear] = useState('')
  const [genre, setGenre] = useState('')
  const [imageData, setImageData] = useState('')
  const [label, setLabel] = useState('')
  const [pressingCountry, setPressingCountry] = useState('')
  const [matrixNumber, setMatrixNumber] = useState('')
  const [deadwax, setDeadwax] = useState('')

  useEffect(() => {
    if (editingAlbum) {
      setTitle(editingAlbum.title || '')
      setArtist(editingAlbum.artist || '')
      setYear(editingAlbum.year ? String(editingAlbum.year) : '')
      setGenre(editingAlbum.genre || '')
      setImageData(editingAlbum.imageUrl || '')
      setLabel(editingAlbum.label || '')
      setPressingCountry(editingAlbum.pressingCountry || '')
      setMatrixNumber(editingAlbum.matrixNumber || '')
      setDeadwax(editingAlbum.deadwax || '')
    }
  }, [editingAlbum])

  function resetForm() {
    setTitle('')
    setArtist('')
    setYear('')
    setGenre('')
    setImageData('')
    setLabel('')
    setPressingCountry('')
    setMatrixNumber('')
    setDeadwax('')
  }

  function handleFileChange(event) {
    const file = event.target.files[0]

    if (!file) {
      setImageData('')
      return
    }

    const reader = new FileReader()
    reader.onload = function () {
      setImageData(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (title.trim() === '' || artist.trim() === '') {
      return
    }

    const albumData = {
      title: title,
      artist: artist,
      year: year.trim() === '' ? null : Number(year),
      genre: genre,
      isInCollection: true,
      imageUrl: imageData,
      label: label,
      pressingCountry: pressingCountry,
      matrixNumber: matrixNumber,
      deadwax: deadwax
    }

    if (editingAlbum) {
      onUpdateAlbum({ ...albumData, id: editingAlbum.id })
    } else {
      onAddAlbum(albumData)
    }

    resetForm()
  }

  function handleCancel() {
    resetForm()
    onCancelEdit()
  }

  return (
    <form className="add-album-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <AutocompleteInput
          placeholder="Album title"
          value={title}
          onChange={setTitle}
          suggestions={existingTitles}
        />
        <AutocompleteInput
          placeholder="Artist"
          value={artist}
          onChange={setArtist}
          suggestions={existingArtists}
        />
        <input
          type="number"
          placeholder="Year"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
        <AutocompleteInput
          placeholder="Genre"
          value={genre}
          onChange={setGenre}
          suggestions={existingGenres}
        />
      </div>
      <div className="form-row">
        <AutocompleteInput
          placeholder="Label"
          value={label}
          onChange={setLabel}
          suggestions={existingLabels}
        />
        <AutocompleteInput
          placeholder="Pressing country"
          value={pressingCountry}
          onChange={setPressingCountry}
          suggestions={existingPressingCountries}
        />
        <input
          type="text"
          placeholder="Matrix number"
          value={matrixNumber}
          onChange={(event) => setMatrixNumber(event.target.value)}
        />
        <input
          type="text"
          placeholder="Deadwax / runout"
          value={deadwax}
          onChange={(event) => setDeadwax(event.target.value)}
        />
      </div>
      <div className="form-row">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
        {imageData && (
          <img src={imageData} alt="Preview" className="image-preview" />
        )}
        <button type="submit">
          {editingAlbum ? 'Save changes' : 'Add to shelf'}
        </button>
        {editingAlbum && (
          <button type="button" onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default AddAlbumForm