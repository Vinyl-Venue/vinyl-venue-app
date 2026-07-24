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

  const inputClass = "bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm"

  if (isCustom) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          placeholder={`New ${placeholder.toLowerCase()}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleBackToList}
          className="bg-transparent border-0 text-text-muted text-xs cursor-pointer whitespace-nowrap hover:text-accent"
        >
          ← choose from list
        </button>
      </div>
    )
  }

  return (
    <select
      value={options.includes(value) ? value : ''}
      onChange={handleSelectChange}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
      <option value="__add_new__">+ Add new {placeholder.toLowerCase()}</option>
    </select>
  )
}

export default SelectWithCustom