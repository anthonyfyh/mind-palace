'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/avatar'
import { NotificationBell } from '@/components/notification-bell'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
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

  const navItems = [
    ...(user ? [{ href: '/feed', label: 'Feed' }] : []),
    { href: '/browse', label: 'Browse' },
    { href: '/graph', label: 'Mind map' },
    ...(user ? [{ href: '/create', label: 'Create' }] : []),
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-[#fbfaf7]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Mind Palace home">
          <span className="relative flex h-11 w-11 items-center justify-center transition-transform group-hover:-rotate-3">
            <Image
              src="/brain.png"
              alt=""
              width={2000}
              height={2000}
              className="h-11 w-11 object-contain"
              priority
            />
          </span>
          <span className="leading-none">
            <span className="block text-lg font-semibold tracking-tight text-neutral-950">Mind Palace</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400 sm:block">Knowledge atlas</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center rounded-full border border-neutral-200 bg-white/80 p-1 shadow-sm shadow-neutral-950/5 lg:flex">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-neutral-950 text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-2 lg:flex">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2 py-1 shadow-sm">
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
                placeholder="Search…"
                className="w-48 bg-transparent px-2 py-1.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-300"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="rounded-full px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-full border border-neutral-200 bg-white/75 px-4 py-2 text-sm font-medium text-neutral-500 shadow-sm transition-all hover:border-neutral-300 hover:bg-white hover:text-neutral-950"
            >
              Search
            </button>
          )}
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)} className="flex items-center rounded-full border border-neutral-200 bg-white p-1 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md">
                  <Avatar url={avatarUrl} name={displayName ?? username ?? 'U'} size="sm" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-neutral-200 bg-white/95 p-1.5 shadow-xl shadow-neutral-950/10 backdrop-blur">
                    <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">{displayName ?? username}</p>
                      <p className="text-xs text-neutral-400 truncate">@{username}</p>
                    </div>
                    <Link href={username ? `/profile/${username}` : '#'} onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50">Profile</Link>
                    <Link href="/profile/edit" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50">Edit profile</Link>
                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50">Log out</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login"><Button variant="ghost" size="sm" className="rounded-full">Log in</Button></Link>
              <Link href="/auth/signup"><Button size="sm" className="rounded-full bg-neutral-950 px-4 text-white hover:bg-neutral-800">Sign up</Button></Link>
            </>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && <NotificationBell userId={user.id} />}
          {user && (
            <Link href={username ? `/profile/${username}` : '#'}>
              <Avatar url={avatarUrl} name={displayName ?? username ?? 'U'} size="sm" />
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="rounded-full border border-neutral-200 bg-white p-2 text-neutral-500 shadow-sm transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Menu"
          >
            {mobileOpen ? <XIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mx-4 mb-4 flex flex-col gap-1 rounded-3xl border border-neutral-200 bg-white p-4 shadow-xl shadow-neutral-950/10 lg:hidden">
          <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 rounded-full border border-neutral-200 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400"
            />
            <Button type="submit" size="sm" className="rounded-full">Go</Button>
          </form>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <div className="my-2 border-t border-neutral-100" />
              <Link href={username ? `/profile/${username}` : '#'} onClick={() => setMobileOpen(false)} className="rounded-2xl px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Profile</Link>
              <Link href="/profile/edit" onClick={() => setMobileOpen(false)} className="rounded-2xl px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Edit profile</Link>
              <button onClick={handleLogout} className="rounded-2xl px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-50">Log out</button>
            </>
          ) : (
            <>
              <div className="my-2 border-t border-neutral-100" />
              <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="rounded-2xl px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">Log in</Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)} className="rounded-2xl bg-neutral-950 px-3 py-2.5 text-sm font-medium text-white">Sign up</Link>
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
