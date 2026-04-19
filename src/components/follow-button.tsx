'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function FollowButton({ targetId, currentUserId, initialFollowing, initialCount }: {
  targetId: string
  currentUserId: string | null
  initialFollowing: boolean
  initialCount: number
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!currentUserId) { router.push('/auth/login'); return }
    if (loading) return
    setLoading(true)

    const supabase = createClient()
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId)
      setFollowing(false)
      setCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId })
      setFollowing(true)
      setCount(c => c + 1)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
          following
            ? 'border-neutral-300 text-neutral-600 hover:border-red-300 hover:text-red-500'
            : 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700'
        }`}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      <span className="text-sm text-neutral-400">{count} {count === 1 ? 'follower' : 'followers'}</span>
    </div>
  )
}
