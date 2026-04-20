import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { TypeBadge } from '@/components/type-badge'

const SUBJECT_COLORS: Record<string, string> = {
  productivity: '#6366f1',
  'personal-finance': '#10b981',
  career: '#f59e0b',
  economics: '#ef4444',
  'life-skills': '#8b5cf6',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

  const followingIds = (follows ?? []).map(follow => follow.following_id)
  const subscribedTopicIds = (topicSubs ?? []).map(subscription => subscription.entity_id)
  const subscribedSubjectIds = (subjectSubs ?? []).map(subscription => subscription.entity_id)

  const subjectTopicIds: string[] = []
  if (subscribedSubjectIds.length > 0) {
    const { data: subjectTopics } = await supabase
      .from('topics')
      .select('id')
      .in('subject_id', subscribedSubjectIds.map(Number))
    for (const topic of subjectTopics ?? []) subjectTopicIds.push(topic.id)
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

  const posts = feedPosts as {
    id: string
    title: string
    type: string
    created_at: string
    author: { username: string; display_name: string | null; avatar_url: string | null } | null
    topic: { id: string; title: string; subject: { name: string; slug: string } | null } | null
    likes?: { count: number }[]
  }[]

  const subjectNames = new Set(posts.map(post => post.topic?.subject?.name).filter(Boolean))
  const likeTotal = posts.reduce((sum, post) => sum + (post.likes?.[0]?.count ?? 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7]">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-neutral-200 bg-[radial-gradient(circle_at_15%_20%,#ecfeff_0,#ecfeff_18%,transparent_38%),linear-gradient(135deg,#ffffff_0%,#f3eee4_100%)] px-5 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 shadow-sm backdrop-blur">
                Your reading current
              </p>
              <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
                A feed shaped by what you follow.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
                New explanations from followed creators, subscribed topics, and subject rooms flow here so the palace feels alive when you return.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-3xl border border-white/70 bg-white/75 px-4 py-4 shadow-sm backdrop-blur">
                <p className="text-3xl font-semibold text-neutral-950">{followingIds.length}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">authors</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 px-4 py-4 shadow-sm backdrop-blur">
                <p className="text-3xl font-semibold text-neutral-950">{allTopicIds.length}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">topics</p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 px-4 py-4 shadow-sm backdrop-blur">
                <p className="text-3xl font-semibold text-neutral-950">{posts.length}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">posts</p>
              </div>
            </div>
          </div>
        </section>

        {isEmpty ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-neutral-300 bg-white px-6 py-20 text-center shadow-sm">
            <p className="text-lg font-semibold tracking-tight text-neutral-950">Your feed is still waiting for ingredients.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-500">
              Follow creators, subscribe to topics, or subscribe to a subject to turn this into a personalized stream.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/browse?mode=authors" className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                Discover contributors
              </Link>
              <Link href="/browse" className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400">
                Browse topics
              </Link>
            </div>
          </section>
        ) : posts.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-neutral-300 bg-white px-6 py-20 text-center shadow-sm">
            <p className="text-lg font-semibold tracking-tight text-neutral-950">Nothing new yet.</p>
            <p className="mt-3 text-sm text-neutral-500">The people and topics you follow have not published new posts.</p>
          </section>
        ) : (
          <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-4">
              {posts.map(post => {
                const likeCount = post.likes?.[0]?.count ?? 0
                const subjectColor = SUBJECT_COLORS[post.topic?.subject?.slug ?? ''] ?? '#111827'
                return (
                  <article
                    key={post.id}
                    className="group rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          url={post.author?.avatar_url}
                          name={post.author?.display_name ?? post.author?.username ?? '?'}
                          size="md"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/profile/${post.author?.username}`}
                            className="truncate text-sm font-semibold text-neutral-800 hover:text-neutral-950"
                          >
                            {post.author?.display_name ?? post.author?.username}
                          </Link>
                          <p className="text-xs text-neutral-400">{formatDate(post.created_at)}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-neutral-50 px-3 py-1 text-xs text-neutral-400">
                        {likeCount > 0 ? `♥ ${likeCount}` : 'New'}
                      </span>
                    </div>

                    <Link href={`/posts/${post.id}`} className="mt-5 block">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <TypeBadge type={post.type} />
                        {post.topic?.subject && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-500">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                            {post.topic.subject.name}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 group-hover:text-neutral-700">
                        {post.title}
                      </h2>
                      {post.topic && (
                        <p className="mt-3 text-sm text-neutral-500">
                          Filed under <span className="font-medium text-neutral-800">{post.topic.title}</span>
                        </p>
                      )}
                    </Link>
                  </article>
                )
              })}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Feed mix</p>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-[#fbfaf7] px-4 py-3">
                    <span className="text-sm text-neutral-500">Subjects</span>
                    <span className="font-semibold text-neutral-950">{subjectNames.size}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-[#fbfaf7] px-4 py-3">
                    <span className="text-sm text-neutral-500">Likes</span>
                    <span className="font-semibold text-neutral-950">{likeTotal}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-[#fbfaf7] px-4 py-3">
                    <span className="text-sm text-neutral-500">Sources</span>
                    <span className="font-semibold text-neutral-950">{followingIds.length + allTopicIds.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">Tune the signal</p>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Your feed gets better as you follow authors and subscribe to the topic rooms you care about.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link href="/browse?mode=authors" className="rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-neutral-950 hover:bg-neutral-200">
                    Find authors
                  </Link>
                  <Link href="/browse" className="rounded-full border border-white/15 px-4 py-2 text-center text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                    Find topics
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  )
}
