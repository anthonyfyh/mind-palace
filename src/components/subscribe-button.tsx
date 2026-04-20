'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SubscribeButtonProps {
  type: 'topic' | 'subject'
  entityId: string
  userId: string | null
  initialSubscribed: boolean
  label?: string
}

export function SubscribeButton({ type, entityId, userId, initialSubscribed, label }: SubscribeButtonProps) {
  const router = useRouter()
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  async function toggle() {
    if (!userId) { router.push('/auth/login'); return }
    setLoading(true)
    const supabase = createClient()

    if (subscribed) {
      await supabase.from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('type', type)
        .eq('entity_id', entityId)
      setSubscribed(false)
    } else {
      await supabase.from('subscriptions')
        .insert({ user_id: userId, type, entity_id: entityId })
      setSubscribed(true)
    }
    setLoading(false)
    router.refresh()
  }

  const displayLabel = label ?? (type === 'topic' ? 'topic' : 'subject')

  return (
    <button
      onClick={toggle}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`text-sm px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
        subscribed
          ? hovered
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
      }`}
    >
      {loading ? '…' : subscribed ? (hovered ? `Unsubscribe` : `Subscribed ✓`) : `Subscribe to ${displayLabel}`}
    </button>
  )
}
