import { useState } from 'react'

function AutocompleteInput({ type = 'text', placeholder, value, onChange, suggestions }) {
  const [showSuggestions, setShowSuggestions] = useState(false)

  const matches = suggestions.filter((item) =>
    item.toLowerCase().includes(value.toLowerCase()) &&
    item.toLowerCase() !== value.toLowerCase()
  )

  function handleSelect(item) {
    onChange(item)
    setShowSuggestions(false)
  }

  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setShowSuggestions(true)
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        className="bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm"
      />
      {showSuggestions && value.trim() !== '' && matches.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-surface border border-border rounded mt-1 py-1 list-none z-10 max-h-40 overflow-y-auto">
          {matches.map((item) => (
            <li
              key={item}
              onClick={() => handleSelect(item)}
              className="px-3 py-2 font-sans text-sm cursor-pointer hover:bg-bg hover:text-accent"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AutocompleteInput