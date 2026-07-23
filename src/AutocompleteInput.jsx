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
    <div className="autocomplete-wrapper">
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
      />
      {showSuggestions && value.trim() !== '' && matches.length > 0 && (
        <ul className="suggestion-list">
          {matches.map((item) => (
            <li key={item} onClick={() => handleSelect(item)}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AutocompleteInput