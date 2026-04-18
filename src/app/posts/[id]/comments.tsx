'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Comment = {
  id: string
  body: string
  created_at: string
  author: { username: string; display_name: string | null } | null
}

export function Comments({ postId, initialComments, userId }: {
  postId: string
  initialComments: Comment[]
  userId: string | null
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: user.id, body: body.trim() })
      .select(`id, body, created_at, author:profiles(username, display_name)`)
      .single()

    if (!error && data) {
      setComments(prev => [data as Comment, ...prev])
      setBody('')
    }
    setSubmitting(false)
  }

  return (
    <div className="mt-12 pt-8 border-t border-neutral-100">
      <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6">
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </h2>

      {userId ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share a thought…"
            rows={3}
            className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors resize-none mb-3"
          />
          <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
            {submitting ? 'Posting…' : 'Post comment'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-neutral-400 mb-8">
          <a href="/auth/login" className="text-neutral-700 underline underline-offset-2">Log in</a> to leave a comment.
        </p>
      )}

      {comments.length > 0 ? (
        <div className="flex flex-col gap-6">
          {comments.map(comment => (
            <div key={comment.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-neutral-900">
                  {comment.author?.display_name ?? comment.author?.username}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-neutral-700">{comment.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No comments yet.</p>
      )}
    </div>
  )
}
