"use client"

import Select from "react-select"

const customStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: 'var(--bg-primary)',
    borderColor: state.isFocused ? 'var(--accent)' : 'var(--border-subtle)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--accent)' : 'none',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    padding: '0.1rem',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    minHeight: '38px',
    opacity: state.isDisabled ? 0.7 : 1,
    '&:hover': {
        borderColor: 'var(--accent)',
    }
  }),
  menu: (base: any) => ({
    ...base,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    zIndex: 100,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
    }
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'var(--text-primary)',
  }),
  input: (base: any) => ({
    ...base,
    color: 'var(--text-primary)'
  }),
  placeholder: (base: any) => ({
    ...base,
    color: 'var(--text-secondary)'
  }),
}

export default function SearchableSelect({
  name,
  options,
  defaultValue,
  value,
  onChange,
  placeholder,
  required,
  isMulti,
  isDisabled
}: {
  name?: string
  options: { value: string; label: string }[]
  defaultValue?: string | string[]
  value?: any
  onChange?: (val: any) => void
  placeholder?: string
  required?: boolean
  isMulti?: boolean
  isDisabled?: boolean
}) {
  const selectedOption = value !== undefined
    ? value
    : (isMulti 
        ? options.filter(o => (defaultValue as string[])?.includes(o.value))
        : options.find(o => o.value === defaultValue) || null)

  return (
    <>
      <Select
        name={name}
        options={options}
        value={selectedOption}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        styles={customStyles}
        isSearchable
        isMulti={isMulti}
        isDisabled={isDisabled}
        classNamePrefix="react-select"
      />
    </>
  )
}
