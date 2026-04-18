'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

type Topic = { id: string; title: string }

export type MentionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListHandle, { items: Topic[]; command: (item: { id: string; label: string }) => void }>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex]
          if (item) command({ id: item.id, label: item.title })
          return true
        }
        return false
      },
    }))

    if (!items.length) {
      return (
        <div className="bg-white border border-neutral-200 rounded-md shadow-md p-2 text-xs text-neutral-400">
          No topics found
        </div>
      )
    }

    return (
      <div className="bg-white border border-neutral-200 rounded-md shadow-md overflow-hidden min-w-[200px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => command({ id: item.id, label: item.title })}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
