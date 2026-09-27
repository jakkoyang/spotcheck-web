import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { categoryFilters, type CategoryFilterId } from '../lib/spotFilters'
import type { VibeTag } from '../types/location'

const chipClass = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1 text-xs font-medium shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${
    active
      ? 'border-emerald-400 bg-emerald-950/90 text-emerald-300'
      : 'border-neutral-700 bg-neutral-900/95 text-neutral-300 hover:text-neutral-100'
  }`

interface FilterBarProps {
  categoryId: CategoryFilterId
  onCategoryChange: (categoryId: CategoryFilterId) => void
  vibeTags: VibeTag[]
  selectedVibeSlugs: string[]
  onToggleVibe: (slug: string) => void
}

export function FilterBar({
  categoryId,
  onCategoryChange,
  vibeTags,
  selectedVibeSlugs,
  onToggleVibe,
}: FilterBarProps) {
  const [showVibes, setShowVibes] = useState(false)
  const vibeCount = selectedVibeSlugs.length

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setShowVibes((current) => !current)}
          aria-label="Vibe filters"
          aria-expanded={showVibes}
          className={`${chipClass(showVibes || vibeCount > 0)} flex items-center gap-1`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {vibeCount > 0 && vibeCount}
        </button>
        {categoryFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onCategoryChange(filter.id)}
            className={chipClass(categoryId === filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {showVibes && (
        <div className="flex flex-wrap gap-2">
          {vibeTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleVibe(tag.slug)}
              className={chipClass(selectedVibeSlugs.includes(tag.slug))}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
