const SIZES = {
  sm: { box: 'w-8 h-8',   text: 'text-xs' },
  md: { box: 'w-10 h-10', text: 'text-sm' },
  lg: { box: 'w-16 h-16', text: 'text-xl' },
}

export function Avatar({
  url,
  name,
  size = 'md',
}: {
  url?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const { box, text } = SIZES[size]
  const letters = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${box} rounded-full object-cover shrink-0`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className={`${box} rounded-full bg-neutral-900 flex items-center justify-center shrink-0`}>
      <span className={`${text} font-semibold text-white`}>{letters}</span>
    </div>
  )
}
