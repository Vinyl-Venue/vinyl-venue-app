import { useState, useEffect } from 'react'
import AutocompleteInput from './AutocompleteInput'
import SelectWithCustom from './SelectWithCustom'
import SpecialTagsInput from './SpecialTagsInput'

const CONDITION_OPTIONS = [
  { value: '', label: 'Select condition' },
  { value: 'M', label: 'Mint (M)' },
  { value: 'NM', label: 'Near Mint (NM)' },
  { value: 'VG+', label: 'Very Good Plus (VG+)' },
  { value: 'VG', label: 'Very Good (VG)' },
  { value: 'G+', label: 'Good / Good Plus (G, G+)' },
  { value: 'F/P', label: 'Fair / Poor (F, P)' }
]

const GENRE_OPTIONS = [
  'Rock', 'Jazz', 'Pop', 'Hip Hop', 'Classical', 'Electronic', 'Folk',
  'Country', 'R&B / Soul', 'Blues', 'Reggae', 'Metal', 'Punk', 'Funk',
  'World', 'Soundtrack'
]

const SUBGENRE_MAP = {
  'Rock': ['Alternative Rock', 'Classic Rock', 'Progressive Rock', 'Psychedelic Rock', 'Garage Rock', 'Southern Rock', 'Arena Rock'],
  'Jazz': ['Bebop', 'Smooth Jazz', 'Fusion', 'Swing', 'Cool Jazz', 'Free Jazz', 'Latin Jazz'],
  'Pop': ['Synthpop', 'Indie Pop', 'Dance Pop', 'Dream Pop', 'Power Pop', 'Baroque Pop'],
  'Hip Hop': ['East Coast Rap', 'West Coast Rap', 'Southern Hip Hop', 'Trap', 'Boom Bap', 'Conscious Hip Hop', 'Golden Age Hip Hop'],
  'Classical': ['Baroque', 'Romantic', 'Classical Era', 'Modern Classical', 'Opera', 'Chamber Music'],
  'Electronic': ['House', 'Techno', 'Ambient', 'Drum and Bass', 'Trance', 'Downtempo', 'IDM'],
  'Folk': ['Americana', 'Contemporary Folk', 'Traditional Folk', 'Indie Folk'],
  'Country': ['Bluegrass', 'Outlaw Country', 'Country Pop', 'Honky Tonk', 'Alt-Country'],
  'R&B / Soul': ['Motown', 'Neo-Soul', 'Contemporary R&B', 'Funk Soul', 'Quiet Storm'],
  'Blues': ['Delta Blues', 'Chicago Blues', 'Electric Blues', 'Blues Rock'],
  'Reggae': ['Ska', 'Dub', 'Roots Reggae', 'Dancehall'],
  'Metal': ['Thrash Metal', 'Doom Metal', 'Heavy Metal', 'Death Metal', 'Black Metal', 'Nu Metal'],
  'Punk': ['Hardcore Punk', 'Pop Punk', 'Post-Punk', 'Punk Rock'],
  'Funk': ['P-Funk', 'Funk Rock', 'Go-Go'],
  'World': ['Afrobeat', 'Latin', 'Bossa Nova', 'Flamenco'],
  'Soundtrack': ['Film Score', 'Video Game Music', 'Musical Theatre']
}

const inputClass = "bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm"
const selectClass = "bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm"

function AddAlbumForm({
  onAddAlbum,
  onUpdateAlbum,
  editingAlbum,
  onCancelEdit,
  existingTitles,
  existingArtists,
  existingLabels,
  existingPressingCountries
}) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [year, setYear] = useState('')
  const [genre, setGenre] = useState('')
  const [subgenre, setSubgenre] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [label, setLabel] = useState('')
  const [pressingCountry, setPressingCountry] = useState('')
  const [matrixNumber, setMatrixNumber] = useState('')
  const [deadwax, setDeadwax] = useState('')
  const [sleeveCondition, setSleeveCondition] = useState('')
  const [mediaCondition, setMediaCondition] = useState('')
  const [specialTags, setSpecialTags] = useState([])

  useEffect(() => {
    if (editingAlbum) {
      setTitle(editingAlbum.title || '')
      setArtist(editingAlbum.artist || '')
      setYear(editingAlbum.year ? String(editingAlbum.year) : '')
      setGenre(editingAlbum.genre || '')
      setSubgenre(editingAlbum.subgenre || '')
      setImageFile(null)
      setImagePreviewUrl(editingAlbum.imageUrl || '')
      setLabel(editingAlbum.label || '')
      setPressingCountry(editingAlbum.pressingCountry || '')
      setMatrixNumber(editingAlbum.matrixNumber || '')
      setDeadwax(editingAlbum.deadwax || '')
      setSleeveCondition(editingAlbum.sleeveCondition || '')
      setMediaCondition(editingAlbum.mediaCondition || '')
      setSpecialTags(editingAlbum.specialTags || [])
    }
  }, [editingAlbum])

  function resetForm() {
    setTitle('')
    setArtist('')
    setYear('')
    setGenre('')
    setSubgenre('')
    setImageFile(null)
    setImagePreviewUrl('')
    setLabel('')
    setPressingCountry('')
    setMatrixNumber('')
    setDeadwax('')
    setSleeveCondition('')
    setMediaCondition('')
    setSpecialTags([])
  }

  function handleGenreChange(newGenre) {
    setGenre(newGenre)
    setSubgenre('')
  }

  function handleFileChange(event) {
    const file = event.target.files[0]

    if (!file) {
      setImageFile(null)
      setImagePreviewUrl('')
      return
    }

    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (title.trim() === '' || artist.trim() === '') {
      return
    }

    const albumData = {
      title: title,
      artist: artist,
      year: year.trim() === '' ? null : Number(year),
      genre: genre,
      subgenre: subgenre,
      isInCollection: true,
      imageFile: imageFile,
      existingImageUrl: editingAlbum ? editingAlbum.imageUrl : '',
      label: label,
      pressingCountry: pressingCountry,
      matrixNumber: matrixNumber,
      deadwax: deadwax,
      sleeveCondition: sleeveCondition,
      mediaCondition: mediaCondition,
      specialTags: specialTags
    }

    if (editingAlbum) {
      await onUpdateAlbum({ ...albumData, id: editingAlbum.id })
    } else {
      await onAddAlbum(albumData)
    }

    resetForm()
  }

  function handleCancel() {
    resetForm()
    onCancelEdit()
  }

  const subgenreOptions = SUBGENRE_MAP[genre] || []

  return (
    <form className="mb-6" onSubmit={handleSubmit}>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
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
          className={inputClass}
        />
      </div>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
        <SelectWithCustom
          placeholder="Genre"
          value={genre}
          onChange={handleGenreChange}
          options={GENRE_OPTIONS}
        />
        <SelectWithCustom
          placeholder={genre ? 'Subgenre' : 'Pick a genre first'}
          value={subgenre}
          onChange={setSubgenre}
          options={subgenreOptions}
        />
      </div>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
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
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Deadwax / runout"
          value={deadwax}
          onChange={(event) => setDeadwax(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
        <select
          value={sleeveCondition}
          onChange={(event) => setSleeveCondition(event.target.value)}
          className={selectClass}
        >
          {CONDITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sleeve: {option.label}
            </option>
          ))}
        </select>
        <select
          value={mediaCondition}
          onChange={(event) => setMediaCondition(event.target.value)}
          className={selectClass}
        >
          {CONDITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Media: {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
        <SpecialTagsInput selectedTags={specialTags} onChange={setSpecialTags} />
      </div>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-text-muted font-sans text-sm"
        />
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="Preview" className="w-10 h-10 object-cover rounded" />
        )}
        <button
          type="submit"
          className="bg-accent text-bg border-0 px-4 py-2 rounded font-sans text-sm cursor-pointer"
        >
          {editingAlbum ? 'Save changes' : 'Add to shelf'}
        </button>
        {editingAlbum && (
          <button
            type="button"
            onClick={handleCancel}
            className="bg-transparent border border-border text-text-muted px-4 py-2 rounded font-sans text-sm cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default AddAlbumForm