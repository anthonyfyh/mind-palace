import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { TopicHeader } from './topic-header'

const TYPE_LABELS: Record<string, string> = {
  solution:  'Solution',
  framework: 'Framework',
  concept:   'Concept',
  process:   'Process',
}

const TYPE_ORDER = ['solution', 'framework', 'concept', 'process']

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { id } = await params
  const { type: typeFilter } = await searchParams
  const supabase = await createClient()

  const [{ data: topic }, { data: allPosts }, { data: { user } }, { data: allTopics }, { data: relations }] =
    await Promise.all([
      supabase.from('topics').select('*, subject:subjects(name, slug)').eq('id', id).single(),
      supabase
        .from('posts')
        .select('id, title, type, created_at, author:profiles(id, username, display_name)')
        .eq('topic_id', id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false }),
      supabase.auth.getUser(),
      supabase.from('topics').select('id, title').order('title'),
      supabase
        .from('topic_relations')
        .select('from_id, to_id')
        .or(`from_id.eq.${id},to_id.eq.${id}`),
    ])

  if (!topic) notFound()

  const isCreator = user?.id === topic.created_by

  // Stats
  const uniqueContributors = new Set((allPosts ?? []).map((p: { author: { id: string } | null }) => p.author?.id).filter(Boolean)).size
  const typesPresent = [...new Set((allPosts ?? []).map((p: { type: string }) => p.type))]
    .sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b))

  // Filter posts by type
  const posts = typeFilter
    ? (allPosts ?? []).filter((p: { type: string }) => p.type === typeFilter)
    : (allPosts ?? [])

  // Related topics (from topic_relations, excluding self)
  const relatedIds = (relations ?? [])
    .map((r: { from_id: string; to_id: string }) => r.from_id === id ? r.to_id : r.from_id)
    .filter((rid: string) => rid !== id)
  const uniqueRelatedIds = [...new Set(relatedIds)] as string[]

  const { data: relatedTopics } = uniqueRelatedIds.length > 0
    ? await supabase
        .from('topics')
        .select('id, title, subject:subjects(name, slug)')
        .in('id', uniqueRelatedIds)
        .limit(6)
    : { data: [] }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-3xl mx-auto w-full px-4 py-10">

        {/* Breadcrumb */}
        <div className="text-sm text-neutral-400 mb-6">
          <Link href={`/browse?subject=${topic.subject?.slug}`} className="hover:text-neutral-600 transition-colors">
            {topic.subject?.name}
          </Link>
        </div>

        {/* Title + description (editable by creator) */}
        <TopicHeader
          topic={{ id: topic.id, title: topic.title, description: topic.description }}
          isCreator={isCreator}
          allTopics={(allTopics ?? []).filter((t: { id: string }) => t.id !== topic.id)}
        />

        {/* Stats strip */}
        <div className="flex items-center gap-5 text-sm text-neutral-500 mt-6 mb-8 pb-8 border-b border-neutral-100">
          <span>
            <strong className="text-neutral-900 font-semibold">{allPosts?.length ?? 0}</strong>{' '}
            {(allPosts?.length ?? 0) === 1 ? 'contribution' : 'contributions'}
          </span>
          <span>
            <strong className="text-neutral-900 font-semibold">{uniqueContributors}</strong>{' '}
            {uniqueContributors === 1 ? 'contributor' : 'contributors'}
          </span>
          {typesPresent.length > 0 && (
            <div className="flex gap-1 ml-auto">
              {typesPresent.map(type => (
                <span key={type} className="text-xs border border-neutral-200 rounded px-2 py-0.5 text-neutral-400">
                  {TYPE_LABELS[type] ?? type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Header row: filter tabs + CTA */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1">
            <Link
              href={`/topics/${id}`}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                !typeFilter
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
            >
              All
            </Link>
            {typesPresent.map(type => (
              <Link
                key={type}
                href={`/topics/${id}?type=${type}`}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  typeFilter === type
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {TYPE_LABELS[type] ?? type}
              </Link>
            ))}
          </div>
          <Link
            href="/create"
            className="text-sm text-neutral-700 border border-neutral-200 rounded-md px-3 py-1.5 hover:border-neutral-400 transition-colors"
          >
            + Add yours
          </Link>
        </div>

        {/* Posts */}
        {posts.length > 0 ? (
          <div className="flex flex-col gap-3 mb-12">
            {posts.map((post: {
              id: string; title: string; type: string; created_at: string
              author: { id: string; username: string; display_name: string | null } | null
            }) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                        {TYPE_LABELS[post.type] ?? post.type}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-neutral-900">{post.title}</h3>
                    <p className="text-sm text-neutral-400 mt-0.5">
                      by{' '}
                      <Link
                        href={`/profile/${post.author?.username}`}
                        onClick={e => e.stopPropagation()}
                        className="hover:text-neutral-600 transition-colors"
                      >
                        {post.author?.display_name ?? post.author?.username}
                      </Link>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400 mt-0.5">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-neutral-400 mb-12">
            <p className="text-sm">
              {typeFilter ? `No ${TYPE_LABELS[typeFilter]} posts yet.` : 'No contributions yet.'}
            </p>
            <Link href="/create" className="mt-3 inline-block text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
              Be the first to contribute
            </Link>
          </div>
        )}

        {/* Related topics */}
        {(relatedTopics ?? []).length > 0 && (
          <section className="border-t border-neutral-100 pt-8">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Related Topics
            </h2>
            <div className="flex flex-col gap-2">
              {(relatedTopics ?? []).map((t: {
                id: string; title: string
                subject: { name: string; slug: string } | null
              }) => (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="flex items-center justify-between border border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 transition-colors"
                >
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">{t.subject?.name}</p>
                    <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                  </div>
                  <span className="text-neutral-300 text-sm">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
