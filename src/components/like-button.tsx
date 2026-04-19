'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LikeButton({ postId, initialCount, initialLiked, userId }: {
  postId: string
  initialCount: number
  initialLiked: boolean
  userId: string | null
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!userId) { router.push('/auth/login'); return }
    if (loading) return
    setLoading(true)

    const supabase = createClient()
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
      setLiked(false)
      setCount(c => c - 1)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      setLiked(true)
      setCount(c => c + 1)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-sm transition-colors ${
        liked
          ? 'text-red-500 hover:text-red-400'
          : 'text-neutral-400 hover:text-neutral-700'
      }`}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <HeartIcon filled={liked} />
      <span>{count}</span>
    </button>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
