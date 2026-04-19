import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { TopicHeader } from './topic-header'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution',
  framework: 'Framework',
  concept: 'Concept',
  process: 'Process',
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: topic }, { data: posts }, { data: { user } }, { data: allTopics }] = await Promise.all([
    supabase
      .from('topics')
      .select(`*, subject:subjects(name, slug)`)
      .eq('id', id)
      .single(),
    supabase
      .from('posts')
      .select(`id, title, type, created_at, author:profiles(username, display_name)`)
      .eq('topic_id', id)
      .eq('is_draft', false)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
    supabase.from('topics').select('id, title').order('title'),
  ])

  if (!topic) notFound()

  const isCreator = user?.id === topic.created_by

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-3xl mx-auto w-full px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
          <Link href={`/browse?subject=${topic.subject?.slug}`} className="hover:text-neutral-600 transition-colors">
            {topic.subject?.name}
          </Link>
        </div>

        <TopicHeader
          topic={{ id: topic.id, title: topic.title, description: topic.description }}
          isCreator={isCreator}
          allTopics={(allTopics ?? []).filter(t => t.id !== topic.id)}
        />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            {posts?.length ?? 0} {posts?.length === 1 ? 'Contribution' : 'Contributions'}
          </h2>
          <Link href="/create" className="text-sm text-neutral-700 border border-neutral-200 rounded-md px-3 py-1.5 hover:border-neutral-400 transition-colors">
            + Add yours
          </Link>
        </div>

        {posts && posts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {posts.map((post: {
              id: string
              title: string
              type: string
              created_at: string
              author: { username: string; display_name: string | null } | null
            }) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5">
                        {TYPE_LABELS[post.type] ?? post.type}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-neutral-900">{post.title}</h3>
                    <p className="text-sm text-neutral-400 mt-0.5">
                      by {post.author?.display_name ?? post.author?.username}
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
          <div className="text-center py-16 text-neutral-400">
            <p className="text-sm">No contributions yet.</p>
            <Link href="/create" className="mt-3 inline-block text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
              Be the first to contribute
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
