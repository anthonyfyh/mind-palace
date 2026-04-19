import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution', framework: 'Framework', concept: 'Concept', process: 'Process',
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (follows ?? []).map(f => f.following_id)

  const { data: posts } = followingIds.length > 0
    ? await supabase
        .from('posts')
        .select(`
          id, title, type, created_at,
          author:profiles(username, display_name, avatar_url),
          topic:topics!posts_topic_id_fkey(id, title, subject:subjects(name, slug)),
          likes(count)
        `)
        .in('author_id', followingIds)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-xl font-semibold tracking-tight mb-8">Your feed</h1>

        {followingIds.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-200 rounded-xl">
            <p className="text-sm text-neutral-500 mb-2">You're not following anyone yet.</p>
            <Link href="/browse?mode=authors" className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
              Discover contributors →
            </Link>
          </div>
        ) : (posts ?? []).length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-200 rounded-xl">
            <p className="text-sm text-neutral-500">No posts from people you follow yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(posts ?? []).map((post: {
              id: string; title: string; type: string; created_at: string
              author: { username: string; display_name: string | null; avatar_url: string | null } | null
              topic: { id: string; title: string; subject: { name: string; slug: string } | null } | null
              likes?: { count: number }[]
            }) => {
              const likeCount = post.likes?.[0]?.count ?? 0
              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar
                      url={post.author?.avatar_url}
                      name={post.author?.display_name ?? post.author?.username ?? '?'}
                      size="sm"
                    />
                    <Link
                      href={`/profile/${post.author?.username}`}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                    >
                      {post.author?.display_name ?? post.author?.username}
                    </Link>
                    <span className="text-neutral-300">·</span>
                    <span className="text-xs text-neutral-400">
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                      {TYPE_LABELS[post.type] ?? post.type}
                    </span>
                    {post.topic?.subject && (
                      <span className="text-xs text-neutral-400">{post.topic.subject.name}</span>
                    )}
                  </div>

                  <h3 className="text-base font-medium text-neutral-900 mb-1">{post.title}</h3>

                  {post.topic && (
                    <p className="text-xs text-neutral-400">on: {post.topic.title}</p>
                  )}

                  {likeCount > 0 && (
                    <p className="text-xs text-neutral-400 mt-2">♥ {likeCount}</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
