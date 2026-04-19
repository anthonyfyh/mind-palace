import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { PostView } from './post-view'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('posts')
    .select('title, author:profiles(display_name, username), topic:topics!posts_topic_id_fkey(title)')
    .eq('id', id)
    .single()

  if (!post) return {}
  const author = (post.author as { display_name: string | null; username: string } | null)
  const topic = (post.topic as { title: string } | null)
  const description = `${author?.display_name ?? author?.username ?? 'A contributor'}'s take on ${topic?.title ?? 'this topic'} — Mind Palace`

  return {
    title: `${post.title} — Mind Palace`,
    description,
    openGraph: {
      title: post.title,
      description,
      images: [{ url: '/logo.png', width: 1080, height: 1080 }],
    },
    twitter: { card: 'summary', title: post.title, description, images: ['/logo.png'] },
  }
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: post }, { data: comments }, { data: { user } }, { data: allTopics }, { count: likeCount }] = await Promise.all([
    supabase
      .from('posts')
      .select(`*, author:profiles(id, username, display_name), topic:topics!posts_topic_id_fkey(id, title, description, subject:subjects(name, slug))`)
      .eq('id', id)
      .single(),
    supabase
      .from('comments')
      .select(`id, body, created_at, author:profiles(username, display_name)`)
      .eq('post_id', id)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
    supabase.from('topics').select('id, title').order('title'),
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
  ])

  if (!post) notFound()

  const userId = user?.id ?? null

  const [{ data: myLike }, { data: myBookmark }, { data: relatedPosts }] = await Promise.all([
    userId
      ? supabase.from('likes').select('user_id').eq('post_id', id).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? supabase.from('bookmarks').select('user_id').eq('post_id', id).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('posts')
      .select('id, title, type, author:profiles(username, display_name), likes(count)')
      .eq('topic_id', post.topic_id)
      .eq('is_draft', false)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <PostView
        post={post}
        comments={comments ?? []}
        userId={userId}
        allTopics={allTopics ?? []}
        likeCount={likeCount ?? 0}
        initialLiked={!!myLike}
        initialBookmarked={!!myBookmark}
        relatedPosts={relatedPosts ?? []}
      />
    </div>
  )
}
