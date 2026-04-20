'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/avatar'

type Notification = {
  id: string
  type: 'new_contribution' | 'new_comment' | 'new_post'
  read: boolean
  created_at: string
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null
  post: { id: string; title: string; topic: { id: string; title: string } | null } | null
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchNotifications()

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userId])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select(`
        id, type, read, created_at,
        actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url),
        post:posts!notifications_post_id_fkey(id, title, topic:topics!posts_topic_id_fkey(id, title))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setNotifications(data as unknown as Notification[])
  }

  async function handleOpen() {
    setOpen(o => !o)
    if (!open && unreadCount > 0) {
      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  function handleNotificationClick(n: Notification) {
    setOpen(false)
    if (n.post?.id) router.push(`/posts/${n.post.id}`)
  }

  function notificationText(n: Notification) {
    const actor = n.actor?.display_name ?? n.actor?.username ?? 'Someone'
    if (n.type === 'new_contribution') {
      return <><strong>{actor}</strong> contributed to <strong>{n.post?.topic?.title ?? 'a topic'}</strong></>
    }
    if (n.type === 'new_post') {
      return <><strong>{actor}</strong> posted <strong>{n.post?.title ?? 'something new'}</strong></>
    }
    return <><strong>{actor}</strong> commented on <strong>{n.post?.title ?? 'your post'}</strong></>
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 bg-white border border-neutral-200 rounded-xl shadow-lg w-80">
          <div className="px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-900">Notifications</p>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-sm text-neutral-400 text-center">No notifications yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-neutral-50">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="shrink-0 mt-0.5">
                    <Avatar
                      url={n.actor?.avatar_url}
                      name={n.actor?.display_name ?? n.actor?.username ?? '?'}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 leading-snug">{notificationText(n)}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
