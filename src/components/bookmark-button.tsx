'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function BookmarkButton({ postId, userId, initialBookmarked }: {
  postId: string
  userId: string | null
  initialBookmarked: boolean
}) {
  const router = useRouter()
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!userId) { router.push('/auth/login'); return }
    if (loading) return
    setLoading(true)

    const supabase = createClient()
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', userId)
      setBookmarked(false)
    } else {
      await supabase.from('bookmarks').insert({ post_id: postId, user_id: userId })
      setBookmarked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-sm transition-colors ${
        bookmarked ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'
      }`}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
    >
      <BookmarkIcon filled={bookmarked} />
    </button>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}
