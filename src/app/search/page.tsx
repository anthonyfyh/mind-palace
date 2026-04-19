import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'

const TYPE_LABELS: Record<string, string> = {
  solution: 'Solution',
  framework: 'Framework',
  concept: 'Concept',
  process: 'Process',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const supabase = await createClient()

  const [{ data: topics }, { data: posts }] = query
    ? await Promise.all([
        supabase
          .from('topics')
          .select('id, title, description, subject:subjects(name, slug)')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .order('title')
          .limit(20),
        supabase
          .from('posts')
          .select('id, title, type, topic:topics(id, title)')
          .ilike('title', `%${query}%`)
          .eq('is_draft', false)
          .order('title')
          .limit(20),
      ])
    : [{ data: [] }, { data: [] }]

  const hasResults = (topics?.length ?? 0) + (posts?.length ?? 0) > 0

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="max-w-2xl mx-auto w-full px-4 py-10">
        <form method="GET" action="/search" className="mb-8">
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Search topics and posts…"
            className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-400 transition-colors"
          />
        </form>

        {!query && (
          <p className="text-sm text-neutral-400">Type something to search.</p>
        )}

        {query && !hasResults && (
          <p className="text-sm text-neutral-400">No results for &ldquo;{query}&rdquo;.</p>
        )}

        {(topics?.length ?? 0) > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Topics
            </h2>
            <div className="flex flex-col gap-2">
              {topics!.map((t: {
                id: string
                title: string
                description: string | null
                subject: { name: string; slug: string } | null
              }) => (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="block border border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 transition-colors"
                >
                  <p className="text-xs text-neutral-400 mb-0.5">{t.subject?.name}</p>
                  <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{t.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {(posts?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Posts
            </h2>
            <div className="flex flex-col gap-2">
              {posts!.map((p: {
                id: string
                title: string
                type: string
                topic: { id: string; title: string } | null
              }) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="block border border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                    <span className="text-xs text-neutral-400">{p.topic?.title}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900">{p.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
