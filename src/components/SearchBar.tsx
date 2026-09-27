import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
}

export function SearchBar({ value, onChange, onFocus }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/95 px-3 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.35)] backdrop-blur">
      <Search className="h-4 w-4 shrink-0 text-neutral-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder="Search spots or addresses"
        className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="shrink-0 text-neutral-500 hover:text-neutral-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
