import type { LucideProps } from 'lucide-react-native'
import { getCategoryMeta } from '../lib/categories'

export function CategoryIcon({ category, ...props }: { category: string } & LucideProps) {
  const { Icon } = getCategoryMeta(category)
  return <Icon {...props} />
}
