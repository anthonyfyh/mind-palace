'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUsername(profile.username ?? '')
        setDisplayName(profile.display_name ?? '')
        setBio(profile.bio ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
      }
      setLoading(false)
    })
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB')
      return
    }

    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setAvatarUrl(publicUrl)
    }
    setUploading(false)
  }

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

        <div className="flex flex-col gap-6">

          {/* Avatar */}
          <div className="flex flex-col gap-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar url={avatarUrl} name={displayName || username} size="lg" />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Change photo'}
                </button>
                <p className="text-xs text-neutral-400">JPG, PNG or WebP · max 5 MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

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
            <Button onClick={handleSave} disabled={saving || uploading}>
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
