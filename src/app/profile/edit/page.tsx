'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, bio')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUsername(profile.username ?? '')
        setDisplayName(profile.display_name ?? '')
        setBio(profile.bio ?? '')
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push(`/profile/${username}`)
  }

  if (loading) return <div className="min-h-screen flex flex-col"><Nav /></div>

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-lg mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-semibold mb-8">Edit profile</h1>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="display-name">Display name</Label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="username">Username</Label>
            <input
              id="username"
              type="text"
              value={username}
              disabled
              className="border border-neutral-200 rounded-md px-3 py-2 text-sm bg-neutral-50 text-neutral-400 cursor-not-allowed"
            />
            <p className="text-xs text-neutral-400">Username cannot be changed.</p>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people a little about yourself…"
              rows={3}
              className="border border-neutral-200 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-400 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/profile/${username}`)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
