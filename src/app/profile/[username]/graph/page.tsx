import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { GraphCanvas } from '@/app/graph/graph-canvas'

export default async function ProfileGraphPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Get topic IDs where this user has written at least one post
  const { data: authorPosts } = await supabase
    .from('posts')
    .select('topic_id')
    .eq('author_id', profile.id)

  const topicIds = [...new Set((authorPosts ?? []).map((p: { topic_id: string }) => p.topic_id))]

  const { data: contributedTopics } = topicIds.length > 0
    ? await supabase
        .from('topics')
        .select('id, title, subject:subjects(slug)')
        .in('id', topicIds)
    : { data: [] }

  const postCountByTopic = (authorPosts ?? []).reduce((acc: Record<string, number>, p: { topic_id: string }) => {
    acc[p.topic_id] = (acc[p.topic_id] ?? 0) + 1
    return acc
  }, {})

  // Relations where both ends are in this creator's topic set
  const { data: relations } = topicIds.length > 0
    ? await supabase
        .from('topic_relations')
        .select('from_id, to_id')
        .in('from_id', topicIds)
        .in('to_id', topicIds)
    : { data: [] }

  const nodes = ((contributedTopics ?? []) as unknown as {
    id: string
    title: string
    subject: { slug: string } | { slug: string }[] | null
  }[]).map(topic => {
    const subject = Array.isArray(topic.subject) ? topic.subject[0] : topic.subject
    return {
      id: topic.id,
      title: topic.title,
      subjectSlug: subject?.slug ?? 'other',
      postCount: postCountByTopic[topic.id] ?? 0,
    }
  })

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

      {/* Header */}
      <div className="absolute top-16 left-6 z-10">
        <Link
          href={`/profile/${username}`}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ← {profile.display_name ?? profile.username}
        </Link>
        <p className="text-sm text-neutral-300 mt-1 font-medium">
          {profile.display_name ?? profile.username}&apos;s knowledge graph
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">{nodes.length} topics</p>
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

      {nodes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">
            No contributions yet.{' '}
            <Link href="/create" className="text-neutral-300 underline underline-offset-2">
              Create a post
            </Link>{' '}
            to build your graph.
          </p>
        </div>
      ) : (
        <div className="flex-1">
          <GraphCanvas nodes={nodes} links={links} />
        </div>
      )}
    </div>
  )
}
