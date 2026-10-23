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

// One horizontally scrolling chip row, like Google Maps: single-select categories first,
// then a divider, then multi-select vibe toggles.
export function FilterBar({
  categoryId,
  onCategoryChange,
  vibeTags,
  selectedVibeSlugs,
  onToggleVibe,
}: FilterBarProps) {
  return (
    <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
      {categoryFilters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onCategoryChange(filter.id)}
          aria-pressed={categoryId === filter.id}
          className={chipClass(categoryId === filter.id)}
        >
          {filter.label}
        </button>
      ))}
      {vibeTags.length > 0 && <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-neutral-700" />}
      {vibeTags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onToggleVibe(tag.slug)}
          aria-pressed={selectedVibeSlugs.includes(tag.slug)}
          className={chipClass(selectedVibeSlugs.includes(tag.slug))}
        >
          {tag.label}
        </button>
      ))}
    </div>
  )
}
