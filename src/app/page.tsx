import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { TypeBadge } from '@/components/type-badge'

const SUBJECT_META: Record<string, { color: string; description: string }> = {
  productivity: {
    color: '#6366f1',
    description: 'Systems, focus, habits, and the art of turning intention into output.',
  },
  'personal-finance': {
    color: '#10b981',
    description: 'Money decisions, tradeoffs, compounding, and practical financial models.',
  },
  career: {
    color: '#f59e0b',
    description: 'Growth, negotiation, reputation, and the choices that shape a working life.',
  },
  economics: {
    color: '#ef4444',
    description: 'Markets, incentives, policy, and the hidden logic behind everyday systems.',
  },
  'life-skills': {
    color: '#8b5cf6',
    description: 'Reusable mental tools for communication, decisions, and daily life.',
  },
}

function subjectMeta(slug?: string | null) {
  return SUBJECT_META[slug ?? ''] ?? {
    color: '#111827',
    description: 'A growing room in the palace.',
  }
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-sm backdrop-blur">
      <p className="text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">{label}</p>
    </div>
  )
}

export default async function Home() {
  const supabase = await createClient()

  const [
    { count: topicCount },
    { count: postCount },
    { count: contributorCount },
    { data: subjects },
    { data: recentTopics },
    { data: trendingRaw },
  ] = await Promise.all([
    supabase.from('topics').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_draft', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('subjects').select('id, name, slug, topics(count)').order('name'),
    supabase
      .from('topics')
      .select('id, title, subject:subjects(name, slug), posts!posts_topic_id_fkey(count)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('posts')
      .select('id, title, type, author:profiles(username, display_name), topic:topics!posts_topic_id_fkey(id, title), likes(count)')
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  type TrendingPost = {
    id: string
    title: string
    type: string
    author: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null
    topic: { id: string; title: string } | { id: string; title: string }[] | null
    likes?: { count: number }[]
  }

  const trendingPosts = ((trendingRaw ?? []) as unknown as TrendingPost[])
    .map(post => ({
      ...post,
      author: Array.isArray(post.author) ? post.author[0] ?? null : post.author,
      topic: Array.isArray(post.topic) ? post.topic[0] ?? null : post.topic,
      likeCount: post.likes?.[0]?.count ?? 0,
    }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 5)

  type RecentTopic = {
    id: string
    title: string
    subject: { name: string; slug: string } | { name: string; slug: string }[] | null
    posts?: { count: number }[]
  }

  const normalizedRecentTopics = ((recentTopics ?? []) as unknown as RecentTopic[])
    .map(topic => ({
      ...topic,
      subject: Array.isArray(topic.subject) ? topic.subject[0] ?? null : topic.subject,
    }))

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7]">
      <Nav />

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-neutral-200 bg-[radial-gradient(circle_at_18%_20%,#fff7ed_0,#fff7ed_24%,transparent_45%),linear-gradient(135deg,#ffffff_0%,#f5efe4_100%)] px-5 py-10 shadow-sm sm:px-8 sm:py-14 lg:px-10">
            <div className="absolute right-8 top-8 hidden h-40 w-40 rounded-full border border-neutral-950/10 bg-white/40 lg:block" />
            <div className="absolute -bottom-20 right-16 h-56 w-56 rounded-full bg-amber-200/30 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                <p className="inline-flex rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 shadow-sm backdrop-blur">
                  Knowledge, shared differently
                </p>
                <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
                  Every topic has more than one doorway.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
                  Mind Palace lets people collect explanations around the same topic, so you can compare frameworks, solutions, concepts, and processes side by side.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/browse">
                    <Button size="lg" className="h-11 rounded-full bg-neutral-950 px-5 text-white hover:bg-neutral-800">
                      Browse the palace
                    </Button>
                  </Link>
                  <Link href="/graph">
                    <Button variant="outline" size="lg" className="h-11 rounded-full border-neutral-300 bg-white/70 px-5">
                      Open mind map
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatPill label="Topics" value={topicCount ?? 0} />
                <StatPill label="Posts" value={postCount ?? 0} />
                <StatPill label="Thinkers" value={contributorCount ?? 0} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Compare explanations until one clicks.</h2>
            <div className="mt-8 space-y-5">
              {[
                ['01', 'Choose a topic', 'Start with a question, concept, or skill you want to understand.'],
                ['02', 'Read multiple takes', 'See how different people frame the same thing.'],
                ['03', 'Add your model', 'Contribute the explanation you wish you had found earlier.'],
              ].map(([step, title, body]) => (
                <div key={step} className="flex gap-4 border-t border-white/10 pt-5">
                  <span className="font-mono text-sm text-white/30">{step}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Browse by subject</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Pick a room</h2>
              </div>
              <Link href="/browse" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(subjects ?? []).map((subject: {
                id: number
                name: string
                slug: string
                topics?: { count: number }[]
              }) => {
                const count = subject.topics?.[0]?.count ?? 0
                const meta = subjectMeta(subject.slug)
                return (
                  <Link
                    key={subject.slug}
                    href={`/browse?subject=${subject.slug}`}
                    className="group rounded-3xl border border-neutral-200 bg-[#fbfaf7] p-4 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-6 h-2 w-16 rounded-full" style={{ backgroundColor: meta.color }} />
                    <h3 className="text-base font-semibold text-neutral-950">{subject.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">{meta.description}</p>
                    <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                      {count} {count === 1 ? 'topic' : 'topics'}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-12 lg:grid-cols-[1.15fr_0.85fr]">
          {trendingPosts.length > 0 && (
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Signal rising</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Trending explanations</h2>
                </div>
                <Link href="/browse" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
                  Browse
                </Link>
              </div>
              <div className="space-y-3">
                {trendingPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="group flex gap-4 rounded-3xl border border-neutral-100 bg-[#fbfaf7] p-4 transition-all hover:border-neutral-300 hover:bg-white hover:shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 font-mono text-sm text-white">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-neutral-950 group-hover:text-neutral-700">{post.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <TypeBadge type={post.type} />
                        <p className="truncate text-xs text-neutral-400">
                          {post.topic?.title} by {post.author?.display_name ?? post.author?.username}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400">{post.likeCount > 0 ? `♥ ${post.likeCount}` : 'New'}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {normalizedRecentTopics.length > 0 && (
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Fresh rooms</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">Recently added</h2>
                </div>
                <Link href="/browse" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {normalizedRecentTopics.map(topic => {
                  const postCount = topic.posts?.[0]?.count ?? 0
                  const meta = subjectMeta(topic.subject?.slug)
                  return (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="block rounded-3xl border border-neutral-100 bg-[#fbfaf7] p-4 transition-all hover:border-neutral-300 hover:bg-white hover:shadow-sm"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="text-xs font-medium text-neutral-400">{topic.subject?.name}</span>
                      </div>
                      <h3 className="text-sm font-semibold leading-snug text-neutral-950">{topic.title}</h3>
                      <p className="mt-3 text-xs text-neutral-400">
                        {postCount} {postCount === 1 ? 'contribution' : 'contributions'}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-14">
          <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 px-5 py-6 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-sm text-neutral-400">Have a perspective worth saving?</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Add a doorway for someone else.</h2>
            </div>
            <Link href="/auth/signup" className="mt-5 inline-flex sm:mt-0">
              <Button className="h-11 rounded-full bg-white px-5 text-neutral-950 hover:bg-neutral-200">
                Share your thinking
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
