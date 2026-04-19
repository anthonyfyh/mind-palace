'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setUsername(profile.username)
          })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setUsername(profile.username)
          })
      } else {
        setUsername(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <header className="border-b border-neutral-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-neutral-900">
          mind palace
        </Link>

        <nav className="flex items-center gap-4">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
                placeholder="Search…"
                className="border border-neutral-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-neutral-400 transition-colors w-48"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Search
            </button>
          )}
          <Link href="/browse" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Browse
          </Link>
          <Link href="/graph" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Graph
          </Link>
          {user ? (
            <>
              <Link href="/create" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
                Create
              </Link>
              <Link href={username ? `/profile/${username}` : '#'}>
                <Button variant="outline" size="sm">Profile</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
