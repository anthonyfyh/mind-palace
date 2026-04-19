import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution', framework: 'Framework', concept: 'Concept', process: 'Process',
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: collection }, { data: { user } }] = await Promise.all([
    supabase
      .from('collections')
      .select(`
        id, title, description, is_draft, created_at,
        subject:subjects(name, slug),
        author:profiles(id, username, display_name, avatar_url),
        collection_posts(
          position,
          post:posts(id, title, type, is_draft, topic:topics!posts_topic_id_fkey(id, title))
        )
      `)
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!collection) notFound()

  const isAuthor = user?.id === (collection.author as { id: string } | null)?.id

  // Only show if published or owner
  if (collection.is_draft && !isAuthor) notFound()

  type CollectionPost = {
    position: number
    post: { id: string; title: string; type: string; is_draft: boolean; topic: { id: string; title: string } | null } | null
  }

  const posts = ((collection.collection_posts as CollectionPost[]) ?? [])
    .filter(cp => cp.post && (!cp.post.is_draft || isAuthor))
    .sort((a, b) => a.position - b.position)

  const author = collection.author as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
  const subject = collection.subject as { name: string; slug: string } | null

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="max-w-2xl mx-auto w-full px-4 py-10">

        {/* Header */}
        <div className="mb-10">
          {subject && (
            <Link href={`/browse?subject=${subject.slug}`} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-wider">
              {subject.name}
            </Link>
          )}
          <div className="flex items-start justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{collection.title}</h1>
              {collection.is_draft && (
                <span className="mt-1 inline-block text-xs text-amber-500 font-medium">Draft</span>
              )}
            </div>
            {isAuthor && (
              <Link href={`/collections/${id}/edit`} className="shrink-0 text-sm border border-neutral-200 rounded-md px-3 py-1.5 text-neutral-600 hover:border-neutral-400 transition-colors">
                Edit
              </Link>
            )}
          </div>

          {collection.description && (
            <p className="mt-3 text-sm text-neutral-500 leading-relaxed">{collection.description}</p>
          )}

          <div className="flex items-center gap-2 mt-4 text-sm text-neutral-400">
            {author && (
              <>
                <Avatar url={author.avatar_url} name={author.display_name ?? author.username} size="sm" />
                <Link href={`/profile/${author.username}`} className="text-neutral-700 hover:text-neutral-900 transition-colors">
                  {author.display_name ?? author.username}
                </Link>
                <span>·</span>
              </>
            )}
            <span>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
          </div>
        </div>

        {/* Post list */}
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-12">No posts in this collection yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {posts.map((cp, i) => (
              <li key={cp.post!.id}>
                <Link
                  href={`/posts/${cp.post!.id}`}
                  className="flex items-start gap-4 border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <span className="text-sm font-mono text-neutral-300 mt-0.5 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                        {TYPE_LABELS[cp.post!.type] ?? cp.post!.type}
                      </span>
                      {cp.post!.is_draft && <span className="text-xs text-amber-500">Draft</span>}
                    </div>
                    <h3 className="text-base font-medium text-neutral-900">{cp.post!.title}</h3>
                    {cp.post!.topic && (
                      <p className="text-xs text-neutral-400 mt-0.5">on: {cp.post!.topic.title}</p>
                    )}
                  </div>
                  <span className="text-neutral-300 text-sm shrink-0 mt-0.5">→</span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {/* CTA for non-authors */}
        {!isAuthor && (
          <div className="mt-10 pt-8 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-sm text-neutral-500">Want to share your own thinking?</p>
            <Link href="/create"><Button size="sm">Create a post</Button></Link>
          </div>
        )}
      </main>
    </div>
  )
}
