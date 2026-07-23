import { useState } from 'react'

const SPECIAL_TAG_OPTIONS = [
  'Mobile Fidelity Sound Lab (MFSL) Original Master Recording',
  'Half-Speed Mastered',
  'Japanese Pressing',
  'European Pressing',
  'Test Pressing',
  'Promo / White Label',
  'Colored Vinyl',
  'Picture Disc',
  'Limited Numbered Edition',
  'Audiophile / Reissue Series',
  'Anniversary Edition',
  'First Pressing'
]

function SpecialTagsInput({ selectedTags, onChange }) {
  const [searchText, setSearchText] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const availableOptions = SPECIAL_TAG_OPTIONS.filter(
    (option) => !selectedTags.includes(option)
  )

  const matches = availableOptions.filter((option) =>
    option.toLowerCase().includes(searchText.toLowerCase())
  )

  function addTag(tag) {
    onChange([...selectedTags, tag])
    setSearchText('')
  }

  function removeTag(tag) {
    onChange(selectedTags.filter((t) => t !== tag))
  }

  return (
    <div className="tags-input-wrapper">
      <div className="tags-chip-row">
        {selectedTags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button
              type="button"
              className="tag-chip-remove"
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder={selectedTags.length === 0 ? 'Search special pressings...' : 'Add another...'}
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
      </div>
      {showDropdown && matches.length > 0 && (
        <ul className="suggestion-list">
          {matches.map((option) => (
            <li key={option} onClick={() => addTag(option)}>
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SpecialTagsInput