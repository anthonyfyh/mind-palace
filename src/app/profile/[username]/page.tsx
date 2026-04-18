import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution',
  framework: 'Framework',
  concept: 'Concept',
  process: 'Process',
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

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, type, created_at, is_draft,
      topic:topics(id, title, subject:subjects(name, slug))
    `)
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  const published = posts?.filter(p => !p.is_draft) ?? []
  const drafts = posts?.filter(p => p.is_draft) ?? []

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-3xl mx-auto w-full px-4 py-10">
        {/* Profile header */}
        <div className="mb-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.display_name ?? profile.username}
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">@{profile.username}</p>
            </div>
            {isOwner && (
              <Link
                href="/profile/edit"
                className="text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors"
              >
                Edit profile
              </Link>
            )}
          </div>
          {profile.bio && (
            <p className="mt-4 text-neutral-600 max-w-xl">{profile.bio}</p>
          )}
        </div>

        {/* Published posts */}
        <section className="mb-10">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            {published.length} Published
          </h2>

          {published.length > 0 ? (
            <div className="flex flex-col gap-3">
              {published.map((post: {
                id: string
                title: string
                type: string
                created_at: string
                is_draft: boolean
                topic: { id: string; title: string; subject: { name: string; slug: string } | null } | null
              }) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5">
                          {TYPE_LABELS[post.type] ?? post.type}
                        </span>
                        {post.topic?.subject && (
                          <span className="text-xs text-neutral-400">{post.topic.subject.name}</span>
                        )}
                      </div>
                      <h3 className="text-base font-medium text-neutral-900">{post.title}</h3>
                      {post.topic && (
                        <p className="text-sm text-neutral-400 mt-0.5">on: {post.topic.title}</p>
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
            <p className="text-sm text-neutral-400">No published posts yet.</p>
          )}
        </section>

        {/* Drafts — only visible to owner */}
        {isOwner && drafts.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
              {drafts.length} Drafts
            </h2>
            <div className="flex flex-col gap-3">
              {drafts.map((post: {
                id: string
                title: string
                type: string
                created_at: string
                is_draft: boolean
                topic: { id: string; title: string; subject: { name: string; slug: string } | null } | null
              }) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block border border-dashed border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5">
                          {TYPE_LABELS[post.type] ?? post.type}
                        </span>
                        <span className="text-xs text-amber-500">Draft</span>
                      </div>
                      <h3 className="text-base font-medium text-neutral-900">{post.title}</h3>
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
