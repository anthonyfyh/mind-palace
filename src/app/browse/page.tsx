import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const { subject: subjectSlug } = await searchParams
  const supabase = await createClient()

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  const activeSubject = subjects?.find((s) => s.slug === subjectSlug) ?? subjects?.[0]

  const { data: topics } = activeSubject
    ? await supabase
        .from('topics')
        .select(`
          id, title, description,
          posts(count)
        `)
        .eq('subject_id', activeSubject.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-5xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Browse</h1>

        {/* Subject tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {subjects?.map((s) => (
            <Link
              key={s.slug}
              href={`/browse?subject=${s.slug}`}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                s.id === activeSubject?.id
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>

        {/* Topics list */}
        {topics && topics.length > 0 ? (
          <div className="flex flex-col gap-3">
            {topics.map((topic: {
              id: string
              title: string
              description: string | null
              posts: { count: number }[]
            }) => {
              const postCount = topic.posts?.[0]?.count ?? 0
              return (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.id}`}
                  className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-medium text-neutral-900">{topic.title}</h2>
                      {topic.description && (
                        <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{topic.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400 mt-0.5">
                      {postCount} {postCount === 1 ? 'contribution' : 'contributions'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-400">
            <p className="text-sm">No topics yet in this subject.</p>
            <Link
              href="/create"
              className="mt-3 inline-block text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
            >
              Be the first to add one
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
