import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { EditForm } from './edit-form'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: post }, { data: { user } }, { data: allTopics }] = await Promise.all([
    supabase
      .from('posts')
      .select(`*, topic:topics(id, title, subject:subjects(name, slug))`)
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
    supabase.from('topics').select('id, title').order('title'),
  ])

  if (!post) notFound()
  if (!user || user.id !== post.author_id) redirect(`/posts/${id}`)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-2xl mx-auto w-full px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
          <Link href={`/topics/${post.topic?.id}`} className="hover:text-neutral-600 transition-colors">
            {post.topic?.title}
          </Link>
          <span>/</span>
          <Link href={`/posts/${id}`} className="hover:text-neutral-600 transition-colors">
            {post.title}
          </Link>
          <span>/</span>
          <span>Edit</span>
        </div>

        <h1 className="text-2xl font-semibold mb-8">Edit post</h1>

        <EditForm
          post={{
            id: post.id,
            title: post.title,
            type: post.type,
            content: post.content,
            is_draft: post.is_draft,
            topic_id: post.topic_id,
          }}
          allTopics={allTopics ?? []}
        />
      </main>
    </div>
  )
}
