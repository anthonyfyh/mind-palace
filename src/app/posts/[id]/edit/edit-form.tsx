'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { extractMentionIds } from '@/lib/extract-mentions'

type Topic = { id: string; title: string }

const POST_TYPES = [
  { value: 'solution', label: 'Solution', description: 'A direct answer to a specific problem' },
  { value: 'framework', label: 'Framework', description: 'A mental model or thinking tool' },
  { value: 'concept', label: 'Concept', description: 'An explanation of what something is' },
  { value: 'process', label: 'Process', description: 'A repeatable step-by-step approach' },
]

export function EditForm({ post, allTopics }: {
  post: { id: string; title: string; type: string; content: object; is_draft: boolean; topic_id: string }
  allTopics: Topic[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(post.title)
  const [postType, setPostType] = useState(post.type)
  const [content, setContent] = useState<object>(post.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(isDraft: boolean) {
    setSaving(true)
    setError(null)

    try {
      if (!title.trim()) throw new Error('Title is required')

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          type: postType,
          content,
          is_draft: isDraft,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      if (updateError) throw updateError

      // Add any new topic relations from updated mentions
      const mentionedIds = extractMentionIds(content as Parameters<typeof extractMentionIds>[0])
      const relations = mentionedIds
        .filter(id => id !== post.topic_id)
        .map(toId => ({ from_id: post.topic_id, to_id: toId }))

      if (relations.length > 0) {
        await supabase.from('topic_relations').insert(relations, { ignoreDuplicates: true })
      }

      router.push(`/posts/${post.id}`)
      router.refresh()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? 'Something went wrong'
      setError(message)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPostType(t.value)}
              className={`text-left px-3 py-2.5 rounded-md border transition-colors ${
                postType === t.value
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className={`text-xs mt-0.5 ${postType === t.value ? 'text-neutral-300' : 'text-neutral-400'}`}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="title">Title</Label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Content</Label>
        <Editor
          content={post.content}
          onChange={setContent}
          topics={allTopics}
          placeholder="Share your thinking. Type [ to link to another topic."
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={() => handleSave(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Publish'}
        </Button>
        <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
          Save as draft
        </Button>
        <Button variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
