import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'

const SUBJECT_COLORS: Record<string, string> = {
  'productivity':     '#6366f1',
  'personal-finance': '#10b981',
  'career':           '#f59e0b',
  'economics':        '#ef4444',
  'life-skills':      '#8b5cf6',
}

export default async function Home() {
  const supabase = await createClient()

  const [
    { count: topicCount },
    { count: postCount },
    { count: contributorCount },
    { data: subjects },
    { data: recentTopics },
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
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto w-full px-4 pt-20 pb-16">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">
          Knowledge, shared differently
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-900 max-w-2xl leading-tight">
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
        <div className="flex gap-8 mt-12 pt-10 border-t border-neutral-100">
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
                className="flex flex-col justify-between rounded-xl border border-neutral-200 px-5 py-4 hover:border-neutral-400 transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full mb-4" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{s.name}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{count} {count === 1 ? 'topic' : 'topics'}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

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

          <div className="mt-12 pt-10 border-t border-neutral-100 flex items-center justify-between">
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
