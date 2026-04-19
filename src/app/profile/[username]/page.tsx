import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'

const TYPE_LABELS: Record<string, string> = {
  solution:  'Solution',
  framework: 'Framework',
  concept:   'Concept',
  process:   'Process',
}

function Initials({ name }: { name: string }) {
  const letters = name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')
  return (
    <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
      <span className="text-xl font-semibold text-white">{letters}</span>
    </div>
  )
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [{ data: posts }, { data: { user } }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, type, created_at, is_draft, topic:topics(id, title, subject:subjects(name, slug))')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  const isOwner = user?.id === profile.id

  const published = (posts ?? []).filter(p => !p.is_draft)
  const drafts = (posts ?? []).filter(p => p.is_draft)

  // Topics this user has contributed to (unique)
  type PostRow = {
    id: string; title: string; type: string; created_at: string; is_draft: boolean
    topic: { id: string; title: string; subject: { name: string; slug: string } | null } | null
  }
  const contributedTopics = [
    ...new Map(
      (posts ?? [])
        .filter((p): p is PostRow & { topic: NonNullable<PostRow['topic']> } => !!p.topic)
        .map(p => [p.topic.id, p.topic])
    ).values(),
  ]

  const displayName = profile.display_name ?? profile.username
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-3xl mx-auto w-full px-4 py-10">

        {/* ── PROFILE HEADER ── */}
        <div className="mb-10">
          <div className="flex items-start gap-5 mb-5">
            <Initials name={displayName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
                  <p className="text-sm text-neutral-400 mt-0.5">@{profile.username}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/profile/${profile.username}/graph`}
                    className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
                  >
                    View graph
                  </Link>
                  {isOwner && (
                    <>
                      <Link href="/create">
                        <Button size="sm">+ Create</Button>
                      </Link>
                      <Link href="/profile/edit">
                        <Button variant="outline" size="sm">Edit profile</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-lg">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 text-sm text-neutral-500 pl-21 border-t border-neutral-100 pt-5 mt-5">
            <span>
              <strong className="text-neutral-900 font-semibold">{published.length}</strong>{' '}
              {published.length === 1 ? 'contribution' : 'contributions'}
            </span>
            <span>
              <strong className="text-neutral-900 font-semibold">{contributedTopics.length}</strong>{' '}
              {contributedTopics.length === 1 ? 'topic' : 'topics'}
            </span>
            <span className="ml-auto text-xs text-neutral-400">Joined {memberSince}</span>
          </div>
        </div>

        {/* ── TOPICS CONTRIBUTED TO ── */}
        {contributedTopics.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {contributedTopics.map(t => (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="text-sm border border-neutral-200 rounded-full px-3 py-1 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── PUBLISHED ── */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            {published.length} Published
          </h2>

          {published.length > 0 ? (
            <div className="flex flex-col gap-3">
              {(published as PostRow[]).map(post => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                          {TYPE_LABELS[post.type] ?? post.type}
                        </span>
                        {post.topic?.subject && (
                          <span className="text-xs text-neutral-400">{post.topic.subject.name}</span>
                        )}
                      </div>
                      <h3 className="text-base font-medium text-neutral-900">{post.title}</h3>
                      {post.topic && (
                        <p className="text-xs text-neutral-400 mt-1">on: {post.topic.title}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400 mt-0.5">
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
              <p className="text-sm text-neutral-400">No published contributions yet.</p>
              {isOwner && (
                <Link href="/create" className="mt-3 inline-block text-sm text-neutral-700 underline underline-offset-2">
                  Write your first post
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ── DRAFTS (owner only) ── */}
        {isOwner && drafts.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
              {drafts.length} {drafts.length === 1 ? 'Draft' : 'Drafts'}
            </h2>
            <div className="flex flex-col gap-3">
              {(drafts as PostRow[]).map(post => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block border border-dashed border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                          {TYPE_LABELS[post.type] ?? post.type}
                        </span>
                        <span className="text-xs text-amber-500 font-medium">Draft</span>
                      </div>
                      <h3 className="text-base font-medium text-neutral-900">{post.title}</h3>
                      {post.topic && (
                        <p className="text-xs text-neutral-400 mt-1">on: {post.topic.title}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400 mt-0.5">
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
