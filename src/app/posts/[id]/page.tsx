import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { PostContent } from './post-content'
import { Comments } from './comments'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution',
  framework: 'Framework',
  concept: 'Concept',
  process: 'Process',
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: post }, { data: comments }, { data: { user } }] = await Promise.all([
    supabase
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, display_name),
        topic:topics(id, title, description, subject:subjects(name, slug))
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('comments')
      .select(`id, body, created_at, author:profiles(username, display_name)`)
      .eq('post_id', id)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  if (!post) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-2xl mx-auto w-full px-4 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
          <Link
            href={`/browse?subject=${post.topic?.subject?.slug}`}
            className="hover:text-neutral-600 transition-colors"
          >
            {post.topic?.subject?.name}
          </Link>
          <span>/</span>
          <Link
            href={`/topics/${post.topic?.id}`}
            className="hover:text-neutral-600 transition-colors"
          >
            {post.topic?.title}
          </Link>
        </div>

        {/* Type badge */}
        <div className="mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 border border-neutral-200 rounded px-2 py-0.5">
            {TYPE_LABELS[post.type] ?? post.type}
          </span>
        </div>

        {/* Header */}
        <h1 className="text-3xl font-semibold tracking-tight mb-3">{post.title}</h1>

        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-8">
          <span>by</span>
          <Link
            href={`/profile/${post.author?.username}`}
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            {post.author?.display_name ?? post.author?.username}
          </Link>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {post.is_draft && (
            <>
              <span>·</span>
              <span className="text-amber-500">Draft</span>
            </>
          )}
        </div>

        {/* Content */}
        <PostContent content={post.content} />

        {/* Comments */}
        <Comments
          postId={id}
          initialComments={comments ?? []}
          userId={user?.id ?? null}
        />
      </main>
    </div>
  )
}
