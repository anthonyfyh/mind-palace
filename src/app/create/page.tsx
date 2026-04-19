'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { extractMentionIds } from '@/lib/extract-mentions'

type Subject = { id: number; name: string; slug: string }
type Topic = { id: string; title: string }

const POST_TYPES = [
  { value: 'solution', label: 'Solution', description: 'A direct answer to a specific problem' },
  { value: 'framework', label: 'Framework', description: 'A mental model or thinking tool' },
  { value: 'concept', label: 'Concept', description: 'An explanation of what something is' },
  { value: 'process', label: 'Process', description: 'A repeatable step-by-step approach' },
]

export default function CreatePage() {
  const router = useRouter()
  const supabase = createClient()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [existingTopics, setExistingTopics] = useState<Topic[]>([])

  const [topicMode, setTopicMode] = useState<'new' | 'existing'>('new')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [topicTitle, setTopicTitle] = useState('')
  const [topicDescription, setTopicDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const [postType, setPostType] = useState('solution')
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState<object>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })
    supabase.from('topics').select('id, title').order('title').then(({ data }) => {
      if (data) setAllTopics(data)
    })
  }, [])

  useEffect(() => {
    setSelectedTopicId('')
    setExistingTopics([])
    if (topicMode !== 'existing' || !subjectId) return
    supabase
      .from('topics')
      .select('id, title')
      .eq('subject_id', subjectId)
      .order('title')
      .then(({ data }) => {
        if (data) setExistingTopics(data)
      })
  }, [subjectId, topicMode])

  async function handleSubmit(isDraft: boolean) {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    try {
      let topicId = selectedTopicId

      if (topicMode === 'new') {
        if (!topicTitle.trim()) throw new Error('Topic title is required')
        if (!subjectId) throw new Error('Please select a subject')

        const { data, error } = await supabase
          .from('topics')
          .insert({
            title: topicTitle.trim(),
            description: topicDescription.trim() || null,
            subject_id: parseInt(subjectId),
            created_by: user.id,
          })
          .select('id')
          .single()

        if (error) throw error
        topicId = data.id

        // Refresh mention list so the new topic is immediately available
        const { data: refreshed } = await supabase.from('topics').select('id, title').order('title')
        if (refreshed) setAllTopics(refreshed)
      }

      if (!topicId) throw new Error('Please select or create a topic')
      if (!postTitle.trim()) throw new Error('Post title is required')

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          topic_id: topicId,
          author_id: user.id,
          type: postType,
          title: postTitle.trim(),
          content: postContent,
          is_draft: isDraft,
        })
        .select('id')
        .single()

      if (postError) throw postError

      // Extract mentions and save topic relations (keyed by post_id for future cleanup)
      const mentionedTopicIds = extractMentionIds(postContent)
      const relations = mentionedTopicIds
        .filter(id => id !== topicId)
        .map(toId => ({ post_id: post.id, from_id: topicId, to_id: toId }))

      if (relations.length > 0) {
        await supabase.from('topic_relations').insert(relations, { ignoreDuplicates: true })
      }

      router.push(`/posts/${post.id}`)
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
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-semibold mb-8">Share your thinking</h1>

        {/* ── TOPIC ── */}
        <section className="mb-8">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Step 1 — The Topic
          </h2>

          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setTopicMode('new')}
              className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                topicMode === 'new'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              Create new topic
            </button>
            <button
              type="button"
              onClick={() => setTopicMode('existing')}
              className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                topicMode === 'existing'
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              Contribute to existing topic
            </button>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <Label htmlFor="subject">Subject</Label>
            <select
              id="subject"
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors bg-white"
            >
              <option value="">Select a subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {topicMode === 'new' ? (
            <>
              <div className="flex flex-col gap-1 mb-4">
                <Label htmlFor="topic-title">Topic title</Label>
                <input
                  id="topic-title"
                  type="text"
                  value={topicTitle}
                  onChange={e => setTopicTitle(e.target.value)}
                  placeholder="e.g. Why does compounding interest grow exponentially?"
                  className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="topic-desc">Description <span className="text-neutral-400 font-normal">(optional)</span></Label>
                <textarea
                  id="topic-desc"
                  value={topicDescription}
                  onChange={e => setTopicDescription(e.target.value)}
                  placeholder="Add more context about the topic…"
                  rows={2}
                  className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors resize-none"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <Label htmlFor="existing-topic">Pick a topic</Label>
              <select
                id="existing-topic"
                value={selectedTopicId}
                onChange={e => setSelectedTopicId(e.target.value)}
                disabled={!subjectId}
                className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors bg-white disabled:opacity-50"
              >
                <option value="">
                  {!subjectId ? 'Select a subject first…' : existingTopics.length === 0 ? 'No topics yet in this subject' : 'Select a topic…'}
                </option>
                {existingTopics.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* ── POST ── */}
        <section className="mb-8">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Step 2 — Your Contribution
          </h2>

          <div className="flex flex-col gap-1 mb-4">
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

          <div className="flex flex-col gap-1 mb-4">
            <Label htmlFor="post-title">Title</Label>
            <input
              id="post-title"
              type="text"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              placeholder="e.g. A visual analogy using a snowball rolling downhill"
              className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Content</Label>
            <Editor
              onChange={setPostContent}
              topics={allTopics}
              placeholder="Share your thinking. Type [ to link to another topic."
            />
          </div>
        </section>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="flex gap-3">
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish'}
          </Button>
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
            Save as draft
          </Button>
        </div>
      </main>
    </div>
  )
}
