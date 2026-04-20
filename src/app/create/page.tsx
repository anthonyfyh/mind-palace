'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { extractMentionIds } from '@/lib/extract-mentions'

type Subject = { id: number; name: string; slug: string }
type Topic = { id: string; title: string; subject_id: number }

const SUBJECT_COLORS: Record<string, string> = {
  productivity: '#6366f1',
  'personal-finance': '#10b981',
  career: '#f59e0b',
  economics: '#ef4444',
  'life-skills': '#8b5cf6',
}

const POST_TYPES = [
  { value: 'solution',  label: 'Solution',  description: 'A direct answer to a specific problem' },
  { value: 'framework', label: 'Framework', description: 'A mental model or thinking tool' },
  { value: 'concept',   label: 'Concept',   description: 'An explanation of what something is' },
  { value: 'process',   label: 'Process',   description: 'A repeatable step-by-step approach' },
]

function PdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

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
        className="group inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm text-neutral-400 transition-colors hover:text-neutral-800"
      >
        <span
          className="h-2.5 w-2.5 rounded-full bg-neutral-200 transition-colors group-hover:bg-neutral-400"
          style={value ? { backgroundColor: SUBJECT_COLORS[value.slug] ?? '#111827' } : undefined}
        />
        {value ? (
          <span className="font-medium text-neutral-800">{value.name}</span>
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
        <div className="absolute left-0 top-9 z-20 w-60 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-xl shadow-neutral-950/10 backdrop-blur">
          {subjects.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s); setOpen(false) }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                value?.id === s.id
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[s.slug] ?? '#111827' }} />
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
        className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm text-neutral-400 transition-colors hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-neutral-300">↳</span>
        {value ? (
          <span className="font-medium text-neutral-800">{value.title}</span>
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
        <div className="absolute left-0 top-9 z-20 w-80 rounded-2xl border border-neutral-200 bg-white/95 shadow-xl shadow-neutral-950/10 backdrop-blur">
          <div className="px-3 py-3">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); if (filtered[0]) select(filtered[0]); else createNew() }
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
              }}
              placeholder="Search or create topic…"
              className="w-full bg-transparent px-1 py-1 text-sm text-neutral-800 outline-none placeholder:text-neutral-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto px-1.5 pb-1.5">
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t)}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                {t.title}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={createNew}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-100"
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
        className="inline-flex items-center gap-1 rounded-full px-1 py-1 text-sm text-neutral-400 transition-colors hover:text-neutral-800"
      >
        <span className="font-medium text-neutral-800">{current.label}</span>
        <span className="text-neutral-300 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-64 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-xl shadow-neutral-950/10 backdrop-blur">
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { onChange(t.value); setOpen(false) }}
              className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
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
  const supabase = useMemo(() => createClient(), [])

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])

  const [subject, setSubject] = useState<Subject | null>(null)
  const [topic, setTopic] = useState<{ id: string | null; title: string } | null>(null)
  const [postType, setPostType] = useState('solution')
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState<object>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [editorKey, setEditorKey] = useState(0)

  function handleSubjectChange(nextSubject: Subject | null) {
    setSubject(nextSubject)
    setTopic(null)
  }

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })
    supabase.from('topics').select('id, title, subject_id').order('title').then(({ data }) => {
      if (data) setAllTopics(data)
    })
  }, [supabase])

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setExtracting(true)
    setExtractError(null)

    const formData = new FormData()
    formData.append('pdf', file)

    const res = await fetch('/api/extract-pdf', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok || json.error) {
      setExtractError(json.error ?? 'Extraction failed. Try again.')
      setExtracting(false)
      return
    }

    if (json.title) setPostTitle(json.title)
    if (json.type) setPostType(json.type)
    if (json.content) {
      setPostContent({ type: 'doc', content: json.content })
      setEditorKey(k => k + 1) // remount editor with new content
    }
    setExtracting(false)
  }

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
    <div className="min-h-screen flex flex-col bg-[#fbfaf7]">
      <Nav />

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:py-10 lg:grid-cols-[1fr_16rem]">
        <section className="relative min-h-[78vh] overflow-hidden rounded-[2.25rem] border border-neutral-200 bg-white shadow-sm">
          <div className="pointer-events-none absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-amber-50/70 to-transparent" />
          <div className="relative mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-12">
            <div className="mb-12 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <SubjectPicker subjects={subjects} value={subject} onChange={handleSubjectChange} />
              <span className="text-neutral-200">/</span>
              <TopicPicker topics={allTopics} subjectId={subject?.id ?? null} value={topic} onChange={setTopic} />
              <span className="text-neutral-200">/</span>
              <TypePicker value={postType} onChange={setPostType} />
            </div>

            <input
              type="text"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              placeholder="Untitled"
              className="mb-8 w-full bg-transparent text-4xl font-semibold leading-tight tracking-tight text-neutral-950 outline-none placeholder:text-neutral-200 sm:text-6xl"
            />

            <Editor
              key={editorKey}
              content={postContent}
              onChange={setPostContent}
              topics={allTopics}
              placeholder="Start writing. Type [ to link to another topic."
            />
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Create</p>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Write naturally first. The subject, topic, and type just help place your page in the palace.
            </p>
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-sm">
            <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm transition-colors ${
              extracting
                ? 'bg-neutral-50 text-neutral-300 pointer-events-none'
                : 'bg-[#fbfaf7] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
            }`}>
              <span className="flex items-center gap-2">
                <PdfIcon />
                {extracting ? 'Extracting…' : 'Import PDF'}
              </span>
              <span className="text-neutral-300">+</span>
              <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" disabled={extracting} />
            </label>
            {extracting && <p className="mt-3 animate-pulse text-xs text-neutral-400">Claude is reading your PDF…</p>}
            {extractError && <p className="mt-3 text-xs text-red-500">{extractError}</p>}
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Ready?</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="h-10 rounded-full bg-white text-neutral-950 hover:bg-neutral-200"
              >
                {saving ? 'Publishing…' : 'Publish'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="h-10 rounded-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Save as draft
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </div>
        </aside>
      </main>
    </div>
  )
}
