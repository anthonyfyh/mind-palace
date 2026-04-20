import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { TopicHeader } from './topic-header'
import { TopicDigest } from '@/components/topic-digest'
import { SubscribeButton } from '@/components/subscribe-button'
import { TypeBadge, TYPE_LABELS } from '@/components/type-badge'
import type { Metadata } from 'next'

function firstValue<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: topic } = await supabase
    .from('topics')
    .select('title, subject:subjects(name)')
    .eq('id', id)
    .single()

  if (!topic) return {}
  const subject = firstValue(topic.subject as unknown as { name: string } | { name: string }[] | null)
  const description = `Explore multiple perspectives on ${topic.title}${subject ? ` in ${subject.name}` : ''} — Mind Palace`
  return {
    title: `${topic.title} — Mind Palace`,
    description,
    openGraph: { title: topic.title, description, images: [{ url: '/logo.png', width: 1080, height: 1080 }] },
    twitter: { card: 'summary', title: topic.title, description, images: ['/logo.png'] },
  }
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

  const userId = user?.id ?? null
  const normalizedTopic = {
    ...topic,
    subject: firstValue(topic.subject as unknown as { name: string; slug: string } | { name: string; slug: string }[] | null),
  }
  const isCreator = userId === topic.created_by
  const mySubResult = userId
    ? await supabase.from('subscriptions').select('user_id').eq('user_id', userId).eq('type', 'topic').eq('entity_id', id).maybeSingle()
    : { data: null }
  const mySub = mySubResult.data
  const isSubscribed = !!mySub

  type TopicPost = {
    id: string
    title: string
    type: string
    created_at: string
    author: { id: string; username: string; display_name: string | null } | { id: string; username: string; display_name: string | null }[] | null
  }
  const normalizedPosts = ((allPosts ?? []) as unknown as TopicPost[]).map(post => ({
    ...post,
    author: firstValue(post.author),
  }))

  // Stats
  const uniqueContributors = new Set(normalizedPosts.map(p => p.author?.id).filter(Boolean)).size
  const typesPresent = [...new Set(normalizedPosts.map(p => p.type))]
    .sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b))

  // Filter posts by type
  const posts = typeFilter
    ? normalizedPosts.filter(p => p.type === typeFilter)
    : normalizedPosts

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

  const normalizedRelatedTopics = ((relatedTopics ?? []) as unknown as {
    id: string
    title: string
    subject: { name: string; slug: string } | { name: string; slug: string }[] | null
  }[]).map(relatedTopic => ({
    ...relatedTopic,
    subject: firstValue(relatedTopic.subject),
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-3xl mx-auto w-full px-4 py-10">

        {/* Breadcrumb */}
        <div className="text-sm text-neutral-400 mb-6">
          <Link href={`/browse?subject=${normalizedTopic.subject?.slug}`} className="hover:text-neutral-600 transition-colors">
            {normalizedTopic.subject?.name}
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
            <strong className="text-neutral-900 font-semibold">{normalizedPosts.length}</strong>{' '}
            {normalizedPosts.length === 1 ? 'contribution' : 'contributions'}
          </span>
          <span>
            <strong className="text-neutral-900 font-semibold">{uniqueContributors}</strong>{' '}
            {uniqueContributors === 1 ? 'contributor' : 'contributors'}
          </span>
          {typesPresent.length > 0 && (
            <div className="flex gap-1 ml-auto flex-wrap">
              {typesPresent.map(type => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          )}
        </div>

        {/* AI Digest */}
        <TopicDigest topicId={id} postCount={normalizedPosts.length} />

        {/* Header row: filter tabs + actions */}
        <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
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
          <div className="flex items-center gap-2">
            {!isCreator && (
              <SubscribeButton
                type="topic"
                entityId={id}
                userId={userId}
                initialSubscribed={isSubscribed}
              />
            )}
            <Link
              href="/create"
              className="text-sm text-neutral-700 border border-neutral-200 rounded-md px-3 py-1.5 hover:border-neutral-400 transition-colors"
            >
              + Add yours
            </Link>
          </div>
        </div>

        {/* Posts */}
        {posts.length > 0 ? (
          <div className="flex flex-col gap-3 mb-12">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <TypeBadge type={post.type} />
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
        {normalizedRelatedTopics.length > 0 && (
          <section className="border-t border-neutral-100 pt-8">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Related Topics
            </h2>
            <div className="flex flex-col gap-2">
              {normalizedRelatedTopics.map(t => (
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
