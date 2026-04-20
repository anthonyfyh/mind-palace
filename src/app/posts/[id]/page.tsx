import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { PostView } from './post-view'
import type { Metadata } from 'next'

function firstValue<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('posts')
    .select('title, author:profiles(display_name, username), topic:topics!posts_topic_id_fkey(title)')
    .eq('id', id)
    .single()

  if (!post) return {}
  const author = firstValue(post.author as unknown as { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null)
  const topic = firstValue(post.topic as unknown as { title: string } | { title: string }[] | null)
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
  const normalizedPost = {
    ...post,
    author: firstValue(post.author as unknown as { id: string; username: string; display_name: string | null } | { id: string; username: string; display_name: string | null }[] | null),
    topic: (() => {
      const topic = firstValue(post.topic as unknown as {
        id: string
        title: string
        description: string | null
        subject: { name: string; slug: string } | { name: string; slug: string }[] | null
      } | {
        id: string
        title: string
        description: string | null
        subject: { name: string; slug: string } | { name: string; slug: string }[] | null
      }[] | null)
      return topic ? { ...topic, subject: firstValue(topic.subject) } : null
    })(),
  }

  const normalizedComments = ((comments ?? []) as unknown as {
    id: string
    body: string
    created_at: string
    author: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null
  }[]).map(comment => ({
    ...comment,
    author: firstValue(comment.author),
  }))

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

  const normalizedRelatedPosts = ((relatedPosts ?? []) as unknown as {
    id: string
    title: string
    type: string
    author: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null
    likes?: { count: number }[]
  }[]).map(relatedPost => ({
    ...relatedPost,
    author: firstValue(relatedPost.author),
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <PostView
        post={normalizedPost}
        comments={normalizedComments}
        userId={userId}
        allTopics={allTopics ?? []}
        likeCount={likeCount ?? 0}
        initialLiked={!!myLike}
        initialBookmarked={!!myBookmark}
        relatedPosts={normalizedRelatedPosts}
      />
    </div>
  )
}
