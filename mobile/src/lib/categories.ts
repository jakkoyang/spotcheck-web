import type { ComponentType } from 'react'
import {
  BookOpen,
  Building2,
  Coffee,
  NotebookPen,
  ShoppingBag,
  Ticket,
  Trees,
  UtensilsCrossed,
  type LucideProps,
} from 'lucide-react-native'

interface CategoryMeta {
  label: string
  Icon: ComponentType<LucideProps>
}

// Keyed by Location.category. Also the map pin icon names (`icon-<category>`).
export const CATEGORY_META: Record<string, CategoryMeta> = {
  library: { label: 'Library', Icon: BookOpen },
  union: { label: 'Union', Icon: Building2 },
  study: { label: 'Study spot', Icon: NotebookPen },
  coffee: { label: 'Coffee', Icon: Coffee },
  food: { label: 'Food', Icon: UtensilsCrossed },
  park: { label: 'Park', Icon: Trees },
  venue: { label: 'Venue', Icon: Ticket },
  shop: { label: 'Shop', Icon: ShoppingBag },
}

const FALLBACK: CategoryMeta = { label: 'Spot', Icon: NotebookPen }

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? FALLBACK
}
