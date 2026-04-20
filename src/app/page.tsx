import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { TypeBadge } from '@/components/type-badge'

const SUBJECT_COLORS: Record<string, string> = {
  'productivity':     '#6366f1',
  'personal-finance': '#10b981',
  'career':           '#f59e0b',
  'economics':        '#ef4444',
  'life-skills':      '#8b5cf6',
}

export default async function Home() {
  const supabase = await createClient()

  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

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
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Sort by like count descending, take top 5
  type TrendingPost = {
    id: string; title: string; type: string
    author: { username: string; display_name: string | null } | null
    topic: { id: string; title: string } | null
    likes?: { count: number }[]
  }
  const trendingPosts = ((trendingRaw ?? []) as TrendingPost[])
    .map(p => ({ ...p, likeCount: p.likes?.[0]?.count ?? 0 }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 5)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto w-full px-4 pt-20 pb-16">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">
          Knowledge, shared differently
        </p>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-neutral-900 max-w-2xl leading-tight">
          Every topic has many perspectives.
        </h1>
        <p className="mt-5 text-lg text-neutral-500 max-w-xl leading-relaxed">
          Mind Palace is where people share their unique ways of understanding things —
          frameworks, solutions, concepts, and processes — all on the same topics.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/browse">
            <Button size="lg">Browse topics</Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="outline" size="lg">Share your thinking</Button>
          </Link>
        </div>

        {/* Platform stats */}
        <div className="flex flex-wrap gap-6 mt-12 pt-10 border-t border-neutral-100">
          {[
            { label: 'Topics', value: topicCount ?? 0 },
            { label: 'Contributions', value: postCount ?? 0 },
            { label: 'Contributors', value: contributorCount ?? 0 },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-3xl font-semibold text-neutral-900">{stat.value}</p>
              <p className="text-sm text-neutral-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SUBJECTS ── */}
      <section className="max-w-5xl mx-auto w-full px-4 pb-16">
        <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-5">
          Browse by subject
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(subjects ?? []).map((s: {
            id: number; name: string; slug: string
            topics?: { count: number }[]
          }) => {
            const count = s.topics?.[0]?.count ?? 0
            const color = SUBJECT_COLORS[s.slug] ?? '#6366f1'
            return (
              <Link
                key={s.slug}
                href={`/browse?subject=${s.slug}`}
                className="flex flex-col rounded-xl border border-neutral-200 overflow-hidden hover:border-neutral-400 hover:shadow-sm transition-all"
              >
                <div className="h-1" style={{ backgroundColor: color }} />
                <div className="px-5 py-4">
                  <p className="text-sm font-semibold text-neutral-900">{s.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{count} {count === 1 ? 'topic' : 'topics'}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── TRENDING ── */}
      {trendingPosts.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Trending</h2>
            <Link href="/browse" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">View all →</Link>
          </div>
          <div className="flex flex-col gap-3">
            {trendingPosts.map((p, i) => (
              <Link
                key={p.id}
                href={`/posts/${p.id}`}
                className="flex items-center gap-4 border border-neutral-200 rounded-xl px-5 py-3.5 hover:border-neutral-400 transition-colors"
              >
                <span className="text-sm font-mono text-neutral-200 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-neutral-900 truncate">{p.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TypeBadge type={p.type} />
                    <p className="text-xs text-neutral-400 truncate">
                      {p.topic?.title} · {p.author?.display_name ?? p.author?.username}
                    </p>
                  </div>
                </div>
                {p.likeCount > 0 && (
                  <span className="text-xs text-neutral-400 shrink-0">♥ {p.likeCount}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── RECENT TOPICS ── */}
      {(recentTopics ?? []).length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Recently added
            </h2>
            <Link href="/browse" className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(recentTopics ?? []).map((t: {
              id: string; title: string
              subject: { name: string; slug: string } | null
              posts?: { count: number }[]
            }) => {
              const postCount = t.posts?.[0]?.count ?? 0
              return (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="block border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <p className="text-xs text-neutral-400 mb-1.5">{t.subject?.name}</p>
                  <h3 className="text-sm font-medium text-neutral-900 leading-snug">{t.title}</h3>
                  <p className="text-xs text-neutral-400 mt-3">
                    {postCount} {postCount === 1 ? 'contribution' : 'contributions'}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-neutral-100">
        <div className="max-w-5xl mx-auto w-full px-4 py-16">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Pick a topic',
                body: 'Browse by subject or search for a specific concept, problem, or question you want to understand better.',
              },
              {
                step: '02',
                title: 'Read different takes',
                body: 'Each topic has contributions from multiple people — solutions, frameworks, concepts, and processes. Find the one that clicks.',
              },
              {
                step: '03',
                title: 'Add your perspective',
                body: 'Have a unique way of thinking about something? Contribute to an existing topic or start a new one.',
              },
            ].map(item => (
              <div key={item.step}>
                <p className="text-xs font-mono text-neutral-300 mb-3">{item.step}</p>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-10 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">Ready to contribute?</p>
            <Link href="/auth/signup">
              <Button>Create an account</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
