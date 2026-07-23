import { useState } from 'react'

function AddAlbumForm({ onAddAlbum }) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    if (title.trim() === '' || artist.trim() === '') {
      return
    }

    onAddAlbum({
      title: title,
      artist: artist,
      year: null,
      genre: '',
      isInCollection: true,
      imageUrl: ''
    })

    setTitle('')
    setArtist('')
  }

  return (
    <form className="add-album-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Album title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        type="text"
        placeholder="Artist"
        value={artist}
        onChange={(event) => setArtist(event.target.value)}
      />
      <button type="submit">Add to shelf</button>
    </form>
  )
}

export default AddAlbumForm