'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { extractMentionIds } from '@/lib/extract-mentions'

type Subject = { id: number; name: string; slug: string }
type Topic = { id: string; title: string; subject_id: number }

const POST_TYPES = [
  { value: 'solution',  label: 'Solution',  description: 'A direct answer to a specific problem' },
  { value: 'framework', label: 'Framework', description: 'A mental model or thinking tool' },
  { value: 'concept',   label: 'Concept',   description: 'An explanation of what something is' },
  { value: 'process',   label: 'Process',   description: 'A repeatable step-by-step approach' },
]

// ── Subject picker ────────────────────────────────────────────────────────────
function SubjectPicker({
  subjects,
  value,
  onChange,
}: {
  subjects: Subject[]
  value: Subject | null
  onChange: (s: Subject | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
      >
        <span className="text-neutral-300">#</span>
        {value ? (
          <span className="text-neutral-700 font-medium">{value.name}</span>
        ) : (
          <span>subject</span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-neutral-300 hover:text-neutral-500 text-xs"
        >
          ×
        </button>
      )}
      {open && (
        <div className="absolute top-7 left-0 z-20 bg-white border border-neutral-200 rounded-lg shadow-md p-2 w-52">
          {subjects.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                value?.id === s.id
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Topic picker ──────────────────────────────────────────────────────────────
function TopicPicker({
  topics,
  subjectId,
  value,
  onChange,
}: {
  topics: Topic[]
  subjectId: number | null
  value: { id: string | null; title: string } | null
  onChange: (t: { id: string | null; title: string } | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = topics
    .filter(t => !subjectId || t.subject_id === subjectId)
    .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)

  const exactMatch = filtered.find(t => t.title.toLowerCase() === query.toLowerCase())

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function openPicker() {
    if (!subjectId) return
    setQuery(value?.title ?? '')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function select(topic: Topic) {
    onChange({ id: topic.id, title: topic.title })
    setOpen(false)
    setQuery('')
  }

  function createNew() {
    if (!query.trim()) return
    onChange({ id: null, title: query.trim() })
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openPicker}
        disabled={!subjectId}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="text-neutral-300">#</span>
        {value ? (
          <span className="text-neutral-700 font-medium">{value.title}</span>
        ) : (
          <span>{subjectId ? 'topic' : 'topic (pick subject first)'}</span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-neutral-300 hover:text-neutral-500 text-xs"
        >
          ×
        </button>
      )}
      {open && (
        <div className="absolute top-7 left-0 z-20 bg-white border border-neutral-200 rounded-lg shadow-md w-72">
          <div className="p-2 border-b border-neutral-100">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); if (filtered[0]) select(filtered[0]); else createNew() }
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
              }}
              placeholder="Search or create topic…"
              className="w-full text-sm outline-none px-1 py-0.5 text-neutral-700 placeholder:text-neutral-300"
            />
          </div>
          <div className="p-1.5 max-h-52 overflow-y-auto">
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t)}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-neutral-100 text-neutral-700 transition-colors"
              >
                {t.title}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={createNew}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors"
              >
                Create &ldquo;{query.trim()}&rdquo;
              </button>
            )}
            {filtered.length === 0 && !query.trim() && (
              <p className="px-3 py-2 text-xs text-neutral-400">No topics in this subject yet. Type to create one.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Type picker ───────────────────────────────────────────────────────────────
function TypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = POST_TYPES.find(t => t.value === value) ?? POST_TYPES[0]

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
      >
        <span className="text-neutral-700 font-medium">{current.label}</span>
        <span className="text-neutral-300 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-20 bg-white border border-neutral-200 rounded-lg shadow-md p-1.5 w-56">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { onChange(t.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                value === t.value
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <p className="text-sm font-medium">{t.label}</p>
              <p className={`text-xs mt-0.5 ${value === t.value ? 'text-neutral-300' : 'text-neutral-400'}`}>
                {t.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreatePage() {
  const router = useRouter()
  const supabase = createClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])

  const [subject, setSubject] = useState<Subject | null>(null)
  const [topic, setTopic] = useState<{ id: string | null; title: string } | null>(null)
  const [postType, setPostType] = useState('solution')
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState<object>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })
    supabase.from('topics').select('id, title, subject_id').order('title').then(({ data }) => {
      if (data) setAllTopics(data)
    })
  }, [])

  // Clear topic when subject changes
  useEffect(() => { setTopic(null) }, [subject])

  async function handleSubmit(isDraft: boolean) {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    try {
      if (!postTitle.trim()) throw new Error('Please add a title')
      if (!subject) throw new Error('Please select a subject')
      if (!topic) throw new Error('Please select or create a topic')

      let topicId = topic.id

      if (!topicId) {
        // Create new topic
        const { data, error } = await supabase
          .from('topics')
          .insert({ title: topic.title, subject_id: subject.id, created_by: user.id })
          .select('id')
          .single()
        if (error) throw error
        topicId = data.id

        const { data: refreshed } = await supabase.from('topics').select('id, title, subject_id').order('title')
        if (refreshed) setAllTopics(refreshed)
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({ topic_id: topicId, author_id: user.id, type: postType, title: postTitle.trim(), content: postContent, is_draft: isDraft })
        .select('id')
        .single()

      if (postError) throw postError

      const mentionedTopicIds = extractMentionIds(postContent)
      const relations = mentionedTopicIds
        .filter(id => id !== topicId)
        .map(toId => ({ post_id: post.id, from_id: topicId, to_id: toId }))
      if (relations.length > 0) {
        await supabase.from('topic_relations').insert(relations)
      }

      // Notify topic creator if this is a published post by someone else
      if (!isDraft) {
        const { data: topicData } = await supabase
          .from('topics')
          .select('created_by')
          .eq('id', topicId)
          .single()
        if (topicData && topicData.created_by !== user.id) {
          await supabase.from('notifications').insert({
            user_id: topicData.created_by,
            type: 'new_contribution',
            actor_id: user.id,
            post_id: post.id,
            topic_id: topicId,
          })
        }
      }

      router.push(`/posts/${post.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? 'Something went wrong'
      setError(message)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-3xl mx-auto w-full px-8 py-12">

        {/* Title */}
        <input
          type="text"
          value={postTitle}
          onChange={e => setPostTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-neutral-900 placeholder:text-neutral-200 outline-none bg-transparent mb-6 leading-tight"
        />

        {/* Inline metadata row */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-neutral-100">
          <SubjectPicker subjects={subjects} value={subject} onChange={setSubject} />
          <span className="text-neutral-200">·</span>
          <TopicPicker topics={allTopics} subjectId={subject?.id ?? null} value={topic} onChange={setTopic} />
          <span className="text-neutral-200">·</span>
          <TypePicker value={postType} onChange={setPostType} />
        </div>

        {/* Editor */}
        <Editor
          onChange={setPostContent}
          topics={allTopics}
          placeholder="Start writing… Type [ to link to another topic."
        />

        {/* Actions */}
        <div className="mt-10 pt-6 border-t border-neutral-100 flex items-center gap-3">
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish'}
          </Button>
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
            Save as draft
          </Button>
          {error && <p className="text-sm text-red-500 ml-2">{error}</p>}
        </div>
      </main>
    </div>
  )
}
