'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'

type Subject = { id: number; name: string; slug: string }
type Post = { id: string; title: string; type: string; topic: { title: string } | null }
type DbPost = { id: string; title: string; type: string; topic: { title: string } | { title: string }[] | null }

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution', framework: 'Framework', concept: 'Concept', process: 'Process',
}

export default function NewCollectionPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [myPosts, setMyPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Post[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: subs }, { data: posts }] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase
          .from('posts')
          .select('id, title, type, topic:topics!posts_topic_id_fkey(title)')
          .eq('author_id', user.id)
          .eq('is_draft', false)
          .order('created_at', { ascending: false }),
      ])
      if (subs) setSubjects(subs)
      if (posts) {
        setMyPosts((posts as unknown as DbPost[]).map(post => ({
          ...post,
          topic: Array.isArray(post.topic) ? post.topic[0] ?? null : post.topic,
        })))
      }
    }
    load()
  }, [router, supabase])

  function togglePost(post: Post) {
    setSelected(prev =>
      prev.find(p => p.id === post.id)
        ? prev.filter(p => p.id !== post.id)
        : [...prev, post]
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSelected(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setSelected(prev => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  async function handleSubmit(isDraft: boolean) {
    if (!title.trim()) { setError('Please add a title'); return }
    if (selected.length === 0) { setError('Add at least one post'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: collection, error: collErr } = await supabase
      .from('collections')
      .insert({ author_id: user.id, title: title.trim(), description: description.trim() || null, subject_id: subjectId, is_draft: isDraft })
      .select('id')
      .single()

    if (collErr || !collection) { setError(collErr?.message ?? 'Failed to create collection'); setSaving(false); return }

    const rows = selected.map((p, i) => ({ collection_id: collection.id, post_id: p.id, position: i + 1 }))
    const { error: postsErr } = await supabase.from('collection_posts').insert(rows)
    if (postsErr) { setError(postsErr.message); setSaving(false); return }

    router.push(`/collections/${collection.id}`)
  }

  const unselected = myPosts.filter(p => !selected.find(s => s.id === p.id))

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8">New collection</h1>

        <div className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Personal Finance Fundamentals"
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Description <span className="normal-case text-neutral-400">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What will readers get from this collection?"
              rows={3}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors resize-none"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Subject <span className="normal-case text-neutral-400">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectId(id => id === s.id ? null : s.id)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    subjectId === s.id
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Post order */}
          {selected.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Order</label>
              <div className="flex flex-col gap-2">
                {selected.map((post, i) => (
                  <div key={post.id} className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-3">
                    <span className="text-xs text-neutral-300 font-mono w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{post.title}</p>
                      <p className="text-xs text-neutral-400">{TYPE_LABELS[post.type]} · {post.topic?.title}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 transition-colors">↑</button>
                      <button onClick={() => moveDown(i)} disabled={i === selected.length - 1} className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 transition-colors">↓</button>
                      <button onClick={() => togglePost(post)} className="p-1 text-neutral-300 hover:text-red-400 transition-colors ml-1">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add posts picker */}
          {unselected.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
                {selected.length === 0 ? 'Add posts' : 'Add more'}
              </label>
              <div className="flex flex-col gap-2">
                {unselected.map(post => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => togglePost(post)}
                    className="flex items-center gap-3 border border-dashed border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 transition-colors text-left"
                  >
                    <span className="text-neutral-200 text-lg leading-none">+</span>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{post.title}</p>
                      <p className="text-xs text-neutral-400">{TYPE_LABELS[post.type]} · {post.topic?.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {myPosts.length === 0 && (
            <p className="text-sm text-neutral-400">You don&apos;t have any published posts yet. <a href="/create" className="text-neutral-700 underline underline-offset-2">Create one first.</a></p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2 border-t border-neutral-100">
            <Button onClick={() => handleSubmit(false)} disabled={saving}>{saving ? 'Publishing…' : 'Publish'}</Button>
            <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>Save as draft</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
