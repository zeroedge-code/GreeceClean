import { CATEGORY_META } from '@/lib/categories'

export default function CategoryBadge({
  categoryId,
  label,
  size = 'md',
}: {
  categoryId: string
  label: string
  size?: 'sm' | 'md'
}) {
  const meta = CATEGORY_META[categoryId]
  const circleSize  = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  const emojiSize   = size === 'sm' ? 'text-base' : 'text-xl'

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${circleSize} rounded-full flex items-center justify-center shrink-0 ${meta?.iconBg ?? 'bg-gray-100'}`}>
        <span className={`${emojiSize} leading-none`}>{meta?.emoji ?? '📍'}</span>
      </span>
      {label && <span>{label}</span>}
    </span>
  )
}
