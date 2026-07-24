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
    <div className="relative flex-1 min-w-60">
      <div className="flex flex-wrap gap-1.5 items-center bg-surface border border-border rounded px-2 py-1.5">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-bg border border-border text-accent font-sans text-xs pl-2.5 pr-1.5 py-0.5 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="bg-transparent border-0 text-text-muted text-sm cursor-pointer leading-none px-0.5 hover:text-accent"
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
          className="bg-transparent border-0 text-text font-sans text-sm flex-1 min-w-[120px] p-1 outline-none"
        />
      </div>
      {showDropdown && matches.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-surface border border-border rounded mt-1 py-1 list-none z-10 max-h-40 overflow-y-auto">
          {matches.map((option) => (
            <li
              key={option}
              onClick={() => addTag(option)}
              className="px-3 py-2 font-sans text-sm cursor-pointer hover:bg-bg hover:text-accent"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SpecialTagsInput