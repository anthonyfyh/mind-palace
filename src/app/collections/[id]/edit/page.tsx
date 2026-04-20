'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'

type Subject = { id: number; name: string; slug: string }
type Post = { id: string; title: string; type: string; topic: { title: string } | null }
type DbPost = { id: string; title: string; type: string; topic: { title: string } | { title: string }[] | null }

function normalizePost(post: DbPost): Post {
  return {
    ...post,
    topic: Array.isArray(post.topic) ? post.topic[0] ?? null : post.topic,
  }
}

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution', framework: 'Framework', concept: 'Concept', process: 'Process',
}

export default function EditCollectionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = useMemo(() => createClient(), [])

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [myPosts, setMyPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Post[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: collection }, { data: subs }, { data: posts }] = await Promise.all([
        supabase
          .from('collections')
          .select('id, title, description, subject_id, is_draft, author_id, collection_posts(position, post:posts(id, title, type, topic:topics!posts_topic_id_fkey(title)))')
          .eq('id', id)
          .single(),
        supabase.from('subjects').select('*').order('name'),
        supabase
          .from('posts')
          .select('id, title, type, topic:topics!posts_topic_id_fkey(title)')
          .eq('author_id', user.id)
          .eq('is_draft', false)
          .order('created_at', { ascending: false }),
      ])

      if (!collection || collection.author_id !== user.id) { router.push('/'); return }

      setTitle(collection.title)
      setDescription(collection.description ?? '')
      setSubjectId(collection.subject_id ?? null)
      if (subs) setSubjects(subs)
      if (posts) setMyPosts((posts as unknown as DbPost[]).map(normalizePost))

      type CP = { position: number; post: DbPost | DbPost[] | null }
      const ordered = ((collection.collection_posts as unknown as CP[]) ?? [])
        .filter(cp => cp.post)
        .sort((a, b) => a.position - b.position)
        .map(cp => normalizePost(Array.isArray(cp.post) ? cp.post[0] : cp.post!))
      setSelected(ordered)
      setLoaded(true)
    }
    load()
  }, [id, router, supabase])

  function togglePost(post: Post) {
    setSelected(prev =>
      prev.find(p => p.id === post.id)
        ? prev.filter(p => p.id !== post.id)
        : [...prev, post]
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSelected(prev => { const n = [...prev]; [n[index - 1], n[index]] = [n[index], n[index - 1]]; return n })
  }

  function moveDown(index: number) {
    setSelected(prev => {
      if (index === prev.length - 1) return prev
      const n = [...prev]; [n[index], n[index + 1]] = [n[index + 1], n[index]]; return n
    })
  }

  async function handleSave(isDraft: boolean) {
    if (!title.trim()) { setError('Please add a title'); return }
    if (selected.length === 0) { setError('Add at least one post'); return }
    setSaving(true); setError(null)

    const { error: updateErr } = await supabase
      .from('collections')
      .update({ title: title.trim(), description: description.trim() || null, subject_id: subjectId, is_draft: isDraft, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    await supabase.from('collection_posts').delete().eq('collection_id', id)
    const rows = selected.map((p, i) => ({ collection_id: id, post_id: p.id, position: i + 1 }))
    const { error: postsErr } = await supabase.from('collection_posts').insert(rows)
    if (postsErr) { setError(postsErr.message); setSaving(false); return }

    router.push(`/collections/${id}`)
  }

  async function handleDelete() {
    if (!confirm('Delete this collection? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('collections').delete().eq('id', id)
    router.push('/profile')
  }

  if (!loaded) return <div className="min-h-screen flex flex-col"><Nav /><p className="m-auto text-sm text-neutral-400">Loading…</p></div>

  const unselected = myPosts.filter(p => !selected.find(s => s.id === p.id))

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8">Edit collection</h1>

        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Description <span className="normal-case text-neutral-400">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">Subject <span className="normal-case text-neutral-400">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button key={s.id} type="button" onClick={() => setSubjectId(id => id === s.id ? null : s.id)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${subjectId === s.id ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

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

          {unselected.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">{selected.length === 0 ? 'Add posts' : 'Add more'}</label>
              <div className="flex flex-col gap-2">
                {unselected.map(post => (
                  <button key={post.id} type="button" onClick={() => togglePost(post)}
                    className="flex items-center gap-3 border border-dashed border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 transition-colors text-left">
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100">
            <Button onClick={() => handleSave(false)} disabled={saving || deleting}>{saving ? 'Saving…' : 'Publish'}</Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving || deleting}>Save as draft</Button>
            <button onClick={handleDelete} disabled={deleting} className="ml-auto text-sm text-red-500 hover:text-red-700 transition-colors">
              {deleting ? 'Deleting…' : 'Delete collection'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
