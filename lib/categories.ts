import {
  LandPlot,
  HardHat,
  Trash,
  Package,
  Disc3,
  Plug,
  Car,
  FlameKindling,
  Armchair,
  Waves,
  Biohazard,
  HelpCircle,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

export type CategoryId =
  | 'illegal_dump'
  | 'construction_debris'
  | 'roadside_litter'
  | 'plastics'
  | 'tires'
  | 'appliances'
  | 'abandoned_vehicle'
  | 'green_waste'
  | 'bulky_items'
  | 'coastal_pollution'
  | 'sewage'
  | 'vandalism'   // legacy — display only
  | 'other'

export type CategoryMeta = {
  icon: LucideIcon
  emoji: string        // Emoji used consistently across homepage, form, badges
  bgColor: string      // Tailwind bg class for card background
  iconBg: string       // Tailwind bg class for icon circle
  iconColor: string    // Tailwind text class for icon
  borderHover: string  // Tailwind border class on hover/selected
}

/** Pastel-themed visual metadata per category. */
export const CATEGORY_META: Record<string, CategoryMeta> = {
  illegal_dump: {
    icon:        LandPlot,
    emoji:       '🗑️',
    bgColor:     'bg-red-50',
    iconBg:      'bg-red-100',
    iconColor:   'text-red-600',
    borderHover: 'hover:border-red-300',
  },
  construction_debris: {
    icon:        HardHat,
    emoji:       '🏗️',
    bgColor:     'bg-stone-50',
    iconBg:      'bg-stone-100',
    iconColor:   'text-stone-600',
    borderHover: 'hover:border-stone-300',
  },
  roadside_litter: {
    icon:        Trash,
    emoji:       '🚮',
    bgColor:     'bg-blue-50',
    iconBg:      'bg-blue-100',
    iconColor:   'text-blue-600',
    borderHover: 'hover:border-blue-300',
  },
  plastics: {
    icon:        Package,
    emoji:       '🧴',
    bgColor:     'bg-teal-50',
    iconBg:      'bg-teal-100',
    iconColor:   'text-teal-600',
    borderHover: 'hover:border-teal-300',
  },
  tires: {
    icon:        Disc3,
    emoji:       '🛞',
    bgColor:     'bg-slate-50',
    iconBg:      'bg-slate-100',
    iconColor:   'text-slate-600',
    borderHover: 'hover:border-slate-300',
  },
  appliances: {
    icon:        Plug,
    emoji:       '🔌',
    bgColor:     'bg-yellow-50',
    iconBg:      'bg-yellow-100',
    iconColor:   'text-yellow-700',
    borderHover: 'hover:border-yellow-300',
  },
  abandoned_vehicle: {
    icon:        Car,
    emoji:       '🚗',
    bgColor:     'bg-purple-50',
    iconBg:      'bg-purple-100',
    iconColor:   'text-purple-600',
    borderHover: 'hover:border-purple-300',
  },
  green_waste: {
    icon:        FlameKindling,
    emoji:       '🌿',
    bgColor:     'bg-orange-50',
    iconBg:      'bg-orange-100',
    iconColor:   'text-orange-600',
    borderHover: 'hover:border-orange-300',
  },
  bulky_items: {
    icon:        Armchair,
    emoji:       '🛋️',
    bgColor:     'bg-amber-50',
    iconBg:      'bg-amber-100',
    iconColor:   'text-amber-700',
    borderHover: 'hover:border-amber-300',
  },
  coastal_pollution: {
    icon:        Waves,
    emoji:       '🌊',
    bgColor:     'bg-cyan-50',
    iconBg:      'bg-cyan-100',
    iconColor:   'text-cyan-600',
    borderHover: 'hover:border-cyan-300',
  },
  sewage: {
    icon:        Biohazard,
    emoji:       '☣️',
    bgColor:     'bg-rose-50',
    iconBg:      'bg-rose-100',
    iconColor:   'text-rose-600',
    borderHover: 'hover:border-rose-300',
  },
  vandalism: {
    icon:        Trash2,
    emoji:       '🔨',
    bgColor:     'bg-gray-50',
    iconBg:      'bg-gray-100',
    iconColor:   'text-gray-500',
    borderHover: 'hover:border-gray-300',
  },
  other: {
    icon:        HelpCircle,
    emoji:       '❓',
    bgColor:     'bg-gray-50',
    iconBg:      'bg-gray-100',
    iconColor:   'text-gray-500',
    borderHover: 'hover:border-gray-300',
  },
}

/** All valid category IDs accepted by the API (includes legacy values). */
export const VALID_CATEGORIES: string[] = [
  // Form categories (11)
  'illegal_dump', 'construction_debris', 'roadside_litter', 'plastics',
  'tires', 'appliances', 'abandoned_vehicle', 'green_waste',
  'bulky_items', 'coastal_pollution', 'sewage', 'other',
  // Legacy (kept for backward compat with existing reports)
  'vandalism',
]
