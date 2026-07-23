import { useState } from 'react'

function SelectWithCustom({ value, onChange, options, placeholder }) {
  const [isCustom, setIsCustom] = useState(false)

  function handleSelectChange(event) {
    const selected = event.target.value
    if (selected === '__add_new__') {
      setIsCustom(true)
      onChange('')
    } else {
      onChange(selected)
    }
  }

  function handleBackToList() {
    setIsCustom(false)
    onChange('')
  }

  if (isCustom) {
    return (
      <div className="custom-select-wrapper">
        <input
          type="text"
          placeholder={`New ${placeholder.toLowerCase()}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus
        />
        <button type="button" className="custom-select-back" onClick={handleBackToList}>
          ← choose from list
        </button>
      </div>
    )
  }

  return (
    <select value={options.includes(value) ? value : ''} onChange={handleSelectChange}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
      <option value="__add_new__">+ Add new {placeholder.toLowerCase()}</option>
    </select>
  )
}

export default SelectWithCustom