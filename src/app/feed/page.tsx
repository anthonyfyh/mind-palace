import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { TypeBadge } from '@/components/type-badge'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: follows },
    { data: topicSubs },
    { data: subjectSubs },
  ] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('subscriptions').select('entity_id').eq('user_id', user.id).eq('type', 'topic'),
    supabase.from('subscriptions').select('entity_id').eq('user_id', user.id).eq('type', 'subject'),
  ])

  const followingIds = (follows ?? []).map(f => f.following_id)
  const subscribedTopicIds = (topicSubs ?? []).map(s => s.entity_id)
  const subscribedSubjectIds = (subjectSubs ?? []).map(s => s.entity_id)

  // Resolve subject subscriptions → topic ids
  const subjectTopicIds: string[] = []
  if (subscribedSubjectIds.length > 0) {
    const { data: subjectTopics } = await supabase
      .from('topics')
      .select('id')
      .in('subject_id', subscribedSubjectIds.map(Number))
    for (const t of subjectTopics ?? []) subjectTopicIds.push(t.id)
  }

  const allTopicIds = [...new Set([...subscribedTopicIds, ...subjectTopicIds])]
  const hasAuthors = followingIds.length > 0
  const hasTopics = allTopicIds.length > 0
  const isEmpty = !hasAuthors && !hasTopics

  const postSelect = `
    id, title, type, created_at,
    author:profiles(username, display_name, avatar_url),
    topic:topics!posts_topic_id_fkey(id, title, subject:subjects(name, slug)),
    likes(count)
  `

  let feedPosts: unknown[] = []

  if (!isEmpty) {
    const filters: string[] = []
    if (hasAuthors) filters.push(`author_id.in.(${followingIds.join(',')})`)
    if (hasTopics) filters.push(`topic_id.in.(${allTopicIds.join(',')})`)

    const { data } = await supabase
      .from('posts')
      .select(postSelect)
      .or(filters.join(','))
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(50)

    feedPosts = data ?? []
  }

  const posts = feedPosts

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-xl font-semibold tracking-tight mb-8">Your feed</h1>

        {isEmpty ? (
          <div className="text-center py-20 border border-dashed border-neutral-200 rounded-xl">
            <p className="text-sm text-neutral-500 mb-2">Your feed is empty — follow authors or subscribe to topics.</p>
            <div className="flex justify-center gap-4 mt-3">
              <Link href="/browse?mode=authors" className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
                Discover contributors →
              </Link>
              <Link href="/browse" className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
                Browse topics →
              </Link>
            </div>
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
                    <TypeBadge type={post.type} />
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
