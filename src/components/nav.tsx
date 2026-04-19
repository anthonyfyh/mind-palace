'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('profiles').select('username, display_name, avatar_url').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile) { setUsername(profile.username); setDisplayName(profile.display_name); setAvatarUrl(profile.avatar_url) }
          })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('profiles').select('username, display_name, avatar_url').eq('id', session.user.id).single()
          .then(({ data: profile }) => {
            if (profile) { setUsername(profile.username); setDisplayName(profile.display_name); setAvatarUrl(profile.avatar_url) }
          })
      } else {
        setUsername(null); setDisplayName(null); setAvatarUrl(null)
      }
    })

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => { subscription.unsubscribe(); document.removeEventListener('mousedown', handleClickOutside) }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

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
            Mind map
          </Link>
          {user ? (
            <>
              <Link href="/create" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
                Create
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
                >
                  <Avatar url={avatarUrl} name={displayName ?? username ?? 'U'} size="sm" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 z-30 bg-white border border-neutral-200 rounded-xl shadow-md py-1.5 w-48">
                    <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">{displayName ?? username}</p>
                      <p className="text-xs text-neutral-400 truncate">@{username}</p>
                    </div>
                    <Link
                      href={username ? `/profile/${username}` : '#'}
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/profile/edit"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Edit profile
                    </Link>
                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
