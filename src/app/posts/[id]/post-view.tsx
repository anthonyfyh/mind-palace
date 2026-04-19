'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Editor } from '@/components/editor'
import { PostContent } from './post-content'
import { Comments } from './comments'
import { LikeButton } from '@/components/like-button'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { extractMentionIds } from '@/lib/extract-mentions'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution',
  framework: 'Framework',
  concept: 'Concept',
  process: 'Process',
}

const POST_TYPES = [
  { value: 'solution', label: 'Solution', description: 'A direct answer to a specific problem' },
  { value: 'framework', label: 'Framework', description: 'A mental model or thinking tool' },
  { value: 'concept', label: 'Concept', description: 'An explanation of what something is' },
  { value: 'process', label: 'Process', description: 'A repeatable step-by-step approach' },
]

type Post = {
  id: string
  title: string
  type: string
  content: object
  is_draft: boolean
  created_at: string
  topic_id: string
  author: { id: string; username: string; display_name: string | null } | null
  topic: { id: string; title: string; subject: { name: string; slug: string } | null } | null
}

type Comment = {
  id: string
  body: string
  created_at: string
  author: { username: string; display_name: string | null } | null
}

type Topic = { id: string; title: string }

export function PostView({ post, comments, userId, allTopics, likeCount, initialLiked }: {
  post: Post
  comments: Comment[]
  userId: string | null
  allTopics: Topic[]
  likeCount: number
  initialLiked: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const isAuthor = userId === post.author?.id

  const [editing, setEditing] = useState(false)
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
        .update({ title: title.trim(), type: postType, content, is_draft: isDraft, updated_at: new Date().toISOString() })
        .eq('id', post.id)

      if (updateError) throw updateError

      // Delete this post's existing edges, then re-insert from current content
      const { error: deleteError } = await supabase.from('topic_relations').delete().eq('post_id', post.id)
      if (deleteError) throw deleteError

      const mentionedIds = extractMentionIds(content)
      const relations = mentionedIds
        .filter(id => id !== post.topic_id)
        .map(toId => ({ post_id: post.id, from_id: post.topic_id, to_id: toId }))
      if (relations.length > 0) {
        const { error: insertError } = await supabase.from('topic_relations').insert(relations)
        if (insertError) throw insertError
      }

      setEditing(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto w-full px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link href={`/browse?subject=${post.topic?.subject?.slug}`} className="hover:text-neutral-600 transition-colors">
          {post.topic?.subject?.name}
        </Link>
        <span>/</span>
        <Link href={`/topics/${post.topic?.id}`} className="hover:text-neutral-600 transition-colors">
          {post.topic?.title}
        </Link>
      </div>

      {editing ? (
        /* ── EDIT MODE ── */
        <div className="flex flex-col gap-5">
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
            <Editor content={post.content} onChange={setContent} topics={allTopics} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving…' : 'Publish'}
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
              Save as draft
            </Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setTitle(post.title); setPostType(post.type) }} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* ── VIEW MODE ── */
        <>
          <div className="mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded px-2 py-0.5">
              {TYPE_LABELS[postType] ?? postType}
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight mb-3">{title}</h1>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span>by</span>
              <Link href={`/profile/${post.author?.username}`} className="text-neutral-700 hover:text-neutral-900 transition-colors">
                {post.author?.display_name ?? post.author?.username}
              </Link>
              <span>·</span>
              <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {post.is_draft && <><span>·</span><span className="text-amber-500">Draft</span></>}
            </div>
            <div className="flex items-center gap-3">
              <LikeButton postId={post.id} initialCount={likeCount} initialLiked={initialLiked} userId={userId} />
              {isAuthor && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <PostContent content={content} />
          <Comments postId={post.id} initialComments={comments} userId={userId} />
        </>
      )}
    </main>
  )
}
