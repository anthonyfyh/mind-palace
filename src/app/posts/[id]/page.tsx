import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { PostView } from './post-view'

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
  const { data: myLike } = userId
    ? await supabase.from('likes').select('user_id').eq('post_id', id).eq('user_id', userId).maybeSingle()
    : { data: null }

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
      />
    </div>
  )
}
