'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function TopicHeader({ topic, isCreator }: {
  topic: { id: string; title: string; description: string | null }
  isCreator: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const [description, setDescription] = useState(topic.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('topics')
      .update({ title: title.trim(), description: description.trim() || null })
      .eq('id', topic.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  if (editing) {
    return (
      <div className="mb-8 flex flex-col gap-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-3xl font-semibold tracking-tight border-0 border-b-2 border-neutral-900 outline-none bg-transparent w-full pb-1"
          autoFocus
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Add a description…"
          rows={2}
          className="text-neutral-500 border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors resize-none"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(topic.title); setDescription(topic.description ?? '') }} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{title}</h1>
          {description && <p className="text-neutral-500">{description}</p>}
        </div>
        {isCreator && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
