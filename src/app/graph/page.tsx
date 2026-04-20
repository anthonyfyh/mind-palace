import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { GraphCanvas } from './graph-canvas'

const SUBJECTS = [
  { label: 'Productivity', slug: 'productivity', color: '#6366f1' },
  { label: 'Personal Finance', slug: 'personal-finance', color: '#10b981' },
  { label: 'Career', slug: 'career', color: '#f59e0b' },
  { label: 'Economics', slug: 'economics', color: '#ef4444' },
  { label: 'Life Skills', slug: 'life-skills', color: '#8b5cf6' },
]

export default async function GraphPage() {
  const supabase = await createClient()

  const [{ data: topics }, { data: relations }] = await Promise.all([
    supabase
      .from('topics')
      .select(`
        id, title,
        subject:subjects(slug),
        posts!posts_topic_id_fkey(count)
      `),
    supabase
      .from('topic_relations')
      .select('from_id, to_id'),
  ])

  const nodes = ((topics ?? []) as unknown as {
    id: string
    title: string
    subject: { slug: string } | { slug: string }[] | null
    posts: { count: number }[]
  }[]).map(topic => {
    const subject = Array.isArray(topic.subject) ? topic.subject[0] : topic.subject
    return {
      id: topic.id,
      title: topic.title,
      subjectSlug: subject?.slug ?? 'other',
      postCount: topic.posts?.[0]?.count ?? 0,
    }
  })

  const seen = new Set<string>()
  const links = (relations ?? [])
    .filter((relation: { from_id: string; to_id: string }) => {
      const key = `${relation.from_id}:${relation.to_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((relation: { from_id: string; to_id: string }) => ({ source: relation.from_id, target: relation.to_id }))

  const connectedNodeIds = new Set<string>()
  for (const link of links) {
    connectedNodeIds.add(String(link.source))
    connectedNodeIds.add(String(link.target))
  }

  const connectedCount = nodes.filter(node => connectedNodeIds.has(node.id)).length
  const densestTopic = [...nodes].sort((a, b) => b.postCount - a.postCount)[0]

  return (
    <div className="min-h-screen bg-[#11100e] text-white">
      <div className="relative z-20 border-b border-white/10 bg-[#11100e]/85 backdrop-blur">
        <Nav />
      </div>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-[-12rem] top-12 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[-10rem] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

        <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[20rem_1fr] lg:px-6">
          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/40">Mind map</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">The palace, seen from above.</h1>
              <p className="mt-4 text-sm leading-6 text-white/55">
                Each node is a topic. Lines appear when posts mention related topics, revealing how the collection is starting to think across rooms.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-2xl font-semibold">{nodes.length}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">topics</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-2xl font-semibold">{links.length}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">links</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-2xl font-semibold">{connectedCount}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">linked</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Legend</p>
                <Link href="/create" className="text-xs font-medium text-white/60 hover:text-white">
                  Add topic
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {SUBJECTS.map(subject => (
                  <Link
                    key={subject.slug}
                    href={`/browse?subject=${subject.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/15 px-3 py-2.5 transition-colors hover:border-white/15 hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2 text-sm text-white/75">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.label}
                    </span>
                    <span className="text-white/25">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {densestTopic && (
              <Link
                href={`/topics/${densestTopic.id}`}
                className="block rounded-[2rem] border border-white/10 bg-amber-200/10 p-5 transition-colors hover:bg-amber-200/15"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/50">Most discussed</p>
                <h2 className="mt-3 text-lg font-semibold leading-snug">{densestTopic.title}</h2>
                <p className="mt-3 text-sm text-white/45">{densestTopic.postCount} contributions</p>
              </Link>
            )}
          </aside>

          <section className="relative min-h-[72vh] overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#151412] shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_70%_70%,rgba(245,158,11,0.12),transparent_30%)]" />
            <div className="absolute left-5 top-5 z-10 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/45 backdrop-blur">
              Drag to explore · click a node to open its topic
            </div>

            {nodes.length === 0 ? (
              <div className="relative z-10 flex h-[72vh] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-sm text-white/50">No topics yet.</p>
                  <Link href="/create" className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950">
                    Create the first node
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative h-[72vh]">
                <GraphCanvas nodes={nodes} links={links} />
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}
