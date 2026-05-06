export type Priority = 'urgent' | 'medium' | 'normal'

/**
 * Calculates the report priority for admin triage and UI highlighting.
 *
 * Urgent (🔴):
 *   - Sewage / chemical contamination — always urgent
 *   - Illegal landfill / dump — always urgent
 *   - Green waste (branches, dry vegetation) — urgent ONLY during Greek fire season
 *     (May 1 – October 31), when dry vegetation becomes a critical fire hazard
 *
 * Medium (🟡):
 *   - Construction debris, abandoned vehicles, coastal pollution
 *
 * Normal (⚪):
 *   - Everything else (plastics, tires, appliances, bulky items, litter, other)
 */
export function calculateReportPriority(
  category: string,
  submittedAt: Date = new Date(),
): Priority {
  // Always urgent — chemical/biological hazard
  if (category === 'sewage') return 'urgent'

  // Always urgent — large-scale illegal disposal
  if (category === 'illegal_dump') return 'urgent'

  // Seasonally urgent: dry vegetation → fire risk May–October (Greek fire season)
  if (category === 'green_waste') {
    const month = submittedAt.getMonth() + 1 // 1–12
    if (month >= 5 && month <= 10) return 'urgent'
  }

  // Medium priority
  if (
    category === 'construction_debris' ||
    category === 'abandoned_vehicle' ||
    category === 'coastal_pollution'
  ) {
    return 'medium'
  }

  return 'normal'
}

export const PRIORITY_LABELS: Record<Priority, Record<string, string>> = {
  urgent: { el: 'Επείγον',   en: 'Urgent',  de: 'Dringend' },
  medium: { el: 'Μέτρια',    en: 'Medium',  de: 'Mittel'   },
  normal: { el: 'Κανονική',  en: 'Normal',  de: 'Normal'   },
}
