const TYPE_CONFIG: Record<string, { label: string; classes: string }> = {
  solution:  { label: 'Solution',  classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  framework: { label: 'Framework', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  concept:   { label: 'Concept',   classes: 'bg-violet-50 text-violet-700 border-violet-200' },
  process:   { label: 'Process',   classes: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export function TypeBadge({ type, className = '' }: { type: string; className?: string }) {
  const config = TYPE_CONFIG[type] ?? { label: type, classes: 'bg-neutral-50 text-neutral-500 border-neutral-200' }
  return (
    <span className={`inline-flex items-center text-xs font-medium border rounded-full px-2.5 py-0.5 ${config.classes} ${className}`}>
      {config.label}
    </span>
  )
}

export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label])
)
