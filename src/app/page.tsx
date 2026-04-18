import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'

const SUBJECTS = [
  { name: 'Productivity', slug: 'productivity' },
  { name: 'Personal Finance', slug: 'personal-finance' },
  { name: 'Career', slug: 'career' },
  { name: 'Economics', slug: 'economics' },
  { name: 'Life Skills', slug: 'life-skills' },
]

export default async function Home() {
  const supabase = await createClient()

  const { data: recentTopics } = await supabase
    .from('topics')
    .select(`
      id, title,
      subject:subjects(name, slug),
      posts(count)
    `)
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-16">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 max-w-2xl leading-tight">
            Every topic has many perspectives.
            <br />
            Find the one that clicks for you.
          </h1>
          <p className="mt-4 text-lg text-neutral-500 max-w-xl">
            Mind Palace is where people share their unique ways of understanding things.
            Browse by topic, not by person.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/browse">
              <Button size="lg">Browse topics</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" size="lg">Share your thinking</Button>
            </Link>
          </div>
        </section>

        {/* Subject grid */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Browse by subject
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {SUBJECTS.map((subject) => (
              <Link
                key={subject.slug}
                href={`/browse?subject=${subject.slug}`}
                className="px-4 py-3 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:border-neutral-400 hover:text-neutral-900 transition-colors text-center"
              >
                {subject.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Recent topics */}
        {recentTopics && recentTopics.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 pb-20">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Recent topics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentTopics.map((topic: {
                id: string
                title: string
                subject: { name: string; slug: string } | null
                posts: { count: number }[]
              }) => {
                const postCount = topic.posts?.[0]?.count ?? 0
                return (
                  <Link
                    key={topic.id}
                    href={`/topics/${topic.id}`}
                    className="block border border-neutral-200 rounded-lg px-4 py-3 hover:border-neutral-400 transition-colors"
                  >
                    <p className="text-xs text-neutral-400 mb-1">{topic.subject?.name}</p>
                    <h3 className="text-sm font-medium text-neutral-900 leading-snug">{topic.title}</h3>
                    <p className="text-xs text-neutral-400 mt-2">
                      {postCount} {postCount === 1 ? 'contribution' : 'contributions'}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
