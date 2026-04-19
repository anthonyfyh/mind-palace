import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { GraphCanvas } from './graph-canvas'

export default async function GraphPage() {
  const supabase = await createClient()

  const [{ data: topics }, { data: relations }] = await Promise.all([
    supabase
      .from('topics')
      .select(`
        id, title,
        subject:subjects(slug),
        posts(count)
      `),
    supabase
      .from('topic_relations')
      .select('from_id, to_id'),
  ])

  const nodes = (topics ?? []).map((t: {
    id: string
    title: string
    subject: { slug: string } | null
    posts: { count: number }[]
  }) => ({
    id: t.id,
    title: t.title,
    subjectSlug: t.subject?.slug ?? 'other',
    postCount: t.posts?.[0]?.count ?? 0,
  }))

  const seen = new Set<string>()
  const links = (relations ?? [])
    .filter((r: { from_id: string; to_id: string }) => {
      const key = `${r.from_id}:${r.to_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((r: { from_id: string; to_id: string }) => ({ source: r.from_id, target: r.to_id }))

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <div className="relative z-10">
        <Nav />
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
        {[
          { label: 'Productivity',     color: '#6366f1' },
          { label: 'Personal Finance', color: '#10b981' },
          { label: 'Career',           color: '#f59e0b' },
          { label: 'Economics',        color: '#ef4444' },
          { label: 'Life Skills',      color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">No topics yet. <a href="/create" className="text-neutral-300 underline underline-offset-2">Create one</a> to see the graph.</p>
        </div>
      )}

      {nodes.length > 0 && (
        <div className="flex-1">
          <GraphCanvas nodes={nodes} links={links} />
        </div>
      )}
    </div>
  )
}
