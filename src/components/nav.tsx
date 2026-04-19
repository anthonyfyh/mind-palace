'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/avatar'
import { NotificationBell } from '@/components/notification-bell'
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
  const [mobileOpen, setMobileOpen] = useState(false)
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
    setMenuOpen(false); setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false); setSearchQuery('')
    }
  }

  const navLinks = (
    <>
      {user && (
        <Link href="/feed" onClick={() => setMobileOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Feed</Link>
      )}
      <Link href="/browse" onClick={() => setMobileOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Browse</Link>
      <Link href="/graph" onClick={() => setMobileOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Mind map</Link>
      {user && (
        <Link href="/create" onClick={() => setMobileOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Create</Link>
      )}
    </>
  )

  return (
    <header className="border-b border-neutral-100 relative z-20">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0 flex items-center">
          <Image src="/logo.png" alt="Mind Palace" width={32} height={32} className="rounded-md" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 flex-1 justify-end">
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
              <button type="button" onClick={() => setSearchOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-600">
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              Search
            </button>
          )}
          {navLinks}
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)} className="flex items-center rounded-full hover:opacity-80 transition-opacity">
                  <Avatar url={avatarUrl} name={displayName ?? username ?? 'U'} size="sm" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-10 z-30 bg-white border border-neutral-200 rounded-xl shadow-md py-1.5 w-48">
                    <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">{displayName ?? username}</p>
                      <p className="text-xs text-neutral-400 truncate">@{username}</p>
                    </div>
                    <Link href={username ? `/profile/${username}` : '#'} onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">Profile</Link>
                    <Link href="/profile/edit" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">Edit profile</Link>
                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">Log out</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link href="/auth/signup"><Button size="sm">Sign up</Button></Link>
            </>
          )}
        </nav>

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-2">
          {user && <NotificationBell userId={user.id} />}
          {user && (
            <Link href={username ? `/profile/${username}` : '#'}>
              <Avatar url={avatarUrl} name={displayName ?? username ?? 'U'} size="sm" />
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <XIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white px-4 py-4 flex flex-col gap-1">
          <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors"
            />
            <Button type="submit" size="sm">Go</Button>
          </form>
          {user && (
            <Link href="/feed" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Feed</Link>
          )}
          <Link href="/browse" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Browse</Link>
          <Link href="/graph" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Mind map</Link>
          {user ? (
            <>
              <Link href="/create" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Create</Link>
              <Link href={username ? `/profile/${username}` : '#'} onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Profile</Link>
              <Link href="/profile/edit" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Edit profile</Link>
              <button onClick={handleLogout} className="py-2.5 text-sm text-red-500 text-left">Log out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700 border-b border-neutral-50">Log in</Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-neutral-700">Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
