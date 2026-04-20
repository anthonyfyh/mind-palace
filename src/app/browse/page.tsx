import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { SubscribeButton } from '@/components/subscribe-button'

const SUBJECT_COLORS: Record<string, string> = {
  'productivity':     '#6366f1',
  'personal-finance': '#10b981',
  'career':           '#f59e0b',
  'economics':        '#ef4444',
  'life-skills':      '#8b5cf6',
}

const TYPE_LABELS: Record<string, string> = {
  solution:  'Solution',
  framework: 'Framework',
  concept:   'Concept',
  process:   'Process',
}

function extractPlainText(raw: string | null): string {
  if (!raw) return ''
  try {
    const doc = JSON.parse(raw)
    const texts: string[] = []
    function walk(node: { text?: string; content?: unknown[] }) {
      if (node.text) texts.push(node.text)
      node.content?.forEach(c => walk(c as { text?: string; content?: unknown[] }))
    }
    walk(doc)
    return texts.join(' ')
  } catch {
    return raw
  }
}


export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; sort?: string; mode?: string }>
}) {
  const { subject: subjectSlug, sort = 'newest', mode = 'topics' } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const { data: subjects } = await supabase.from('subjects').select('*').order('name')
  const activeSubject = subjects?.find(s => s.slug === subjectSlug) ?? subjects?.[0]

  const { data: mySubjectSub } = userId && activeSubject
    ? await supabase.from('subscriptions').select('user_id').eq('user_id', userId).eq('type', 'subject').eq('entity_id', String(activeSubject.id)).maybeSingle()
    : Promise.resolve({ data: null })
  const isSubjectSubscribed = !!mySubjectSub

  // ── AUTHORS MODE ──────────────────────────────────────────────────────────
  if (mode === 'authors') {
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        author_id,
        topic_id,
        topic:topics!posts_topic_id_fkey(subject:subjects(name, slug)),
        author:profiles(id, username, display_name, bio, avatar_url, created_at)
      `)
      .eq('is_draft', false)

    type AuthorRow = {
      author_id: string
      topic_id: string
      topic: { subject: { name: string; slug: string } | null } | null
      author: { id: string; username: string; display_name: string | null; bio: string | null; created_at: string } | null
    }

    // Aggregate per author
    const authorMap = new Map<string, {
      profile: NonNullable<AuthorRow['author']>
      topicIds: Set<string>
      subjectSlugs: Set<string>
      postCount: number
    }>()

    for (const p of (posts ?? []) as AuthorRow[]) {
      if (!p.author) continue
      if (!authorMap.has(p.author_id)) {
        authorMap.set(p.author_id, {
          profile: p.author,
          topicIds: new Set(),
          subjectSlugs: new Set(),
          postCount: 0,
        })
      }
      const entry = authorMap.get(p.author_id)!
      entry.postCount++
      entry.topicIds.add(p.topic_id)
      const slug = p.topic?.subject?.slug
      if (slug) entry.subjectSlugs.add(slug)
    }

    let authors = [...authorMap.values()]

    const authorSort = sort === 'topics' ? 'topics' : sort === 'newest' ? 'newest' : 'popular'
    authors.sort((a, b) => {
      if (authorSort === 'topics')  return b.topicIds.size - a.topicIds.size
      if (authorSort === 'newest')  return new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime()
      return b.postCount - a.postCount
    })

    const totalAuthors = authors.length
    const totalPosts = authors.reduce((s, a) => s + a.postCount, 0)

    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="max-w-5xl mx-auto w-full px-4 py-10">

          {/* Stats */}
          <div className="flex gap-6 mb-8 text-sm text-neutral-500">
            <span><strong className="text-neutral-900 font-semibold">{totalAuthors}</strong> contributors</span>
            <span><strong className="text-neutral-900 font-semibold">{totalPosts}</strong> contributions</span>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-8">
            <Link
              href="/browse?mode=topics"
              className="text-sm px-4 py-2 rounded-full border transition-colors border-neutral-200 text-neutral-600 hover:border-neutral-400"
            >
              By Topic
            </Link>
            <Link
              href="/browse?mode=authors"
              className="text-sm px-4 py-2 rounded-full border transition-colors border-neutral-900 bg-neutral-900 text-white"
            >
              By Author
            </Link>
          </div>

          {/* Sort + grid */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mr-auto">Contributors</h2>
            <div className="flex flex-wrap gap-1">
              {([
                { value: 'popular', label: 'Most contributions' },
                { value: 'topics',  label: 'Most topics' },
                { value: 'newest',  label: 'Newest' },
              ] as const).map(opt => (
                <Link
                  key={opt.value}
                  href={`/browse?mode=authors&sort=${opt.value}`}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    authorSort === opt.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {authors.length === 0 ? (
            <p className="text-sm text-neutral-400 py-20 text-center">No contributors yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {authors.map(({ profile, postCount, topicIds, subjectSlugs }) => (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.username}`}
                  className="flex items-start gap-4 border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
                >
                  <Avatar url={profile.avatar_url} name={profile.display_name ?? profile.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {profile.display_name ?? profile.username}
                    </p>
                    <p className="text-xs text-neutral-400 mb-2">@{profile.username}</p>
                    {profile.bio && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mb-2">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span>{postCount} {postCount === 1 ? 'contribution' : 'contributions'}</span>
                      <span>{topicIds.size} {topicIds.size === 1 ? 'topic' : 'topics'}</span>
                    </div>
                    {subjectSlugs.size > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {[...subjectSlugs].map(slug => (
                          <span
                            key={slug}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: SUBJECT_COLORS[slug] ?? '#ccc' }}
                            title={slug}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── TOPICS MODE ───────────────────────────────────────────────────────────
  const { data: rawTopics } = activeSubject
    ? await supabase
        .from('topics')
        .select('id, title, description, created_at, posts!posts_topic_id_fkey(count)')
        .eq('subject_id', activeSubject.id)
    : { data: [] }

  const topicIds = (rawTopics ?? []).map((t: { id: string }) => t.id)

  const { data: topicPosts } = topicIds.length > 0
    ? await supabase
        .from('posts')
        .select('topic_id, author_id, type')
        .in('topic_id', topicIds)
        .eq('is_draft', false)
    : { data: [] }

  type TopicStats = { contributors: Set<string>; types: Set<string> }
  const statsMap: Record<string, TopicStats> = {}
  for (const p of (topicPosts ?? [])) {
    if (!statsMap[p.topic_id]) statsMap[p.topic_id] = { contributors: new Set(), types: new Set() }
    statsMap[p.topic_id].contributors.add(p.author_id)
    statsMap[p.topic_id].types.add(p.type)
  }

  type Topic = {
    id: string; title: string; description: string | null
    created_at: string; postCount: number; contributorCount: number; types: string[]
  }

  const topics: Topic[] = (rawTopics ?? []).map((t: {
    id: string; title: string; description: string | null; created_at: string
    posts?: { count: number }[]
  }) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    created_at: t.created_at,
    postCount: t.posts?.[0]?.count ?? 0,
    contributorCount: statsMap[t.id]?.contributors.size ?? 0,
    types: [...(statsMap[t.id]?.types ?? [])],
  }))

  const sorted = [...topics].sort((a, b) => {
    if (sort === 'popular')      return b.postCount - a.postCount
    if (sort === 'contributors') return b.contributorCount - a.contributorCount
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const featured = [...topics]
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 3)
    .filter(t => t.postCount > 0)
  const featuredIds = new Set(featured.map(t => t.id))
  const rest = sorted.filter(t => !featuredIds.has(t.id))

  const subjectColor = SUBJECT_COLORS[activeSubject?.slug ?? ''] ?? '#6366f1'
  const totalPosts = topics.reduce((s, t) => s + t.postCount, 0)
  const totalContributors = new Set((topicPosts ?? []).map(p => p.author_id)).size

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="max-w-5xl mx-auto w-full px-4 py-10">

        {/* Stats */}
        <div className="flex gap-6 mb-8 text-sm text-neutral-500">
          <span><strong className="text-neutral-900 font-semibold">{topics.length}</strong> topics</span>
          <span><strong className="text-neutral-900 font-semibold">{totalPosts}</strong> contributions</span>
          <span><strong className="text-neutral-900 font-semibold">{totalContributors}</strong> contributors</span>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <Link
            href={`/browse?mode=topics&subject=${activeSubject?.slug ?? ''}`}
            className="text-sm px-4 py-2 rounded-full border transition-colors border-neutral-900 bg-neutral-900 text-white"
          >
            By Topic
          </Link>
          <Link
            href="/browse?mode=authors"
            className="text-sm px-4 py-2 rounded-full border transition-colors border-neutral-200 text-neutral-600 hover:border-neutral-400"
          >
            By Author
          </Link>
        </div>

        {/* Subject tabs + subscribe */}
        <div className="flex gap-2 flex-wrap items-center mb-8">
          {subjects?.map((s: { id: number; name: string; slug: string }) => (
            <Link
              key={s.slug}
              href={`/browse?subject=${s.slug}&mode=topics`}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                s.id === activeSubject?.id
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {s.name}
            </Link>
          ))}
          {activeSubject && (
            <div className="ml-auto">
              <SubscribeButton
                type="subject"
                entityId={String(activeSubject.id)}
                userId={userId}
                initialSubscribed={isSubjectSubscribed}
                label={activeSubject.name}
              />
            </div>
          )}
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <p className="text-sm">No topics yet in this subject.</p>
            <Link href="/create" className="mt-3 inline-block text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
              Be the first to add one
            </Link>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">Featured</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {featured.map(t => (
                    <Link
                      key={t.id}
                      href={`/topics/${t.id}`}
                      className="flex flex-col rounded-xl border border-neutral-200 p-5 hover:border-neutral-400 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: subjectColor }} />
                      <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{t.title}</h3>
                      {t.description && (
                        <p className="text-xs text-neutral-500 line-clamp-2 mb-3 flex-1">
                          {extractPlainText(t.description)}
                        </p>
                      )}
                      <div className="mt-auto">
                        <div className="flex gap-3 text-xs text-neutral-400 mb-2">
                          <span>{t.postCount} {t.postCount === 1 ? 'contribution' : 'contributions'}</span>
                          <span>{t.contributorCount} {t.contributorCount === 1 ? 'contributor' : 'contributors'}</span>
                        </div>
                        {t.types.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {t.types.map(type => (
                              <span key={type} className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                                {TYPE_LABELS[type] ?? type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* All topics + sort */}
            {rest.length > 0 && (
              <section>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mr-auto">
                    {featured.length > 0 ? 'All Topics' : 'Topics'}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {([
                      { value: 'newest',       label: 'Newest' },
                      { value: 'popular',      label: 'Most contributions' },
                      { value: 'contributors', label: 'Most contributors' },
                    ] as const).map(opt => (
                      <Link
                        key={opt.value}
                        href={`/browse?subject=${activeSubject?.slug}&sort=${opt.value}&mode=topics`}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          sort === opt.value
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                        }`}
                      >
                        {opt.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {rest.map(t => (
                    <Link
                      key={t.id}
                      href={`/topics/${t.id}`}
                      className="block border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-400 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-neutral-900">{t.title}</h3>
                          {t.description && (
                            <p className="mt-1 text-sm text-neutral-500 line-clamp-1">
                              {extractPlainText(t.description)}
                            </p>
                          )}
                          {t.types.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {t.types.map(type => (
                                <span key={type} className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-400">
                                  {TYPE_LABELS[type] ?? type}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-xs text-neutral-400 space-y-0.5 mt-0.5">
                          <p>{t.postCount} {t.postCount === 1 ? 'contribution' : 'contributions'}</p>
                          <p>{t.contributorCount} {t.contributorCount === 1 ? 'contributor' : 'contributors'}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
