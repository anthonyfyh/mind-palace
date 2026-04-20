import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { Avatar } from '@/components/avatar'
import { SubscribeButton } from '@/components/subscribe-button'
import { TypeBadge } from '@/components/type-badge'

const SUBJECT_META: Record<string, { color: string; tint: string; description: string }> = {
  productivity: {
    color: '#6366f1',
    tint: 'from-indigo-50 via-white to-slate-50',
    description: 'Systems, focus, habits, and better ways to turn intention into output.',
  },
  'personal-finance': {
    color: '#10b981',
    tint: 'from-emerald-50 via-white to-teal-50',
    description: 'Money decisions explained through practical models, examples, and tradeoffs.',
  },
  career: {
    color: '#f59e0b',
    tint: 'from-amber-50 via-white to-orange-50',
    description: 'Work, growth, negotiation, and the choices that shape a professional path.',
  },
  economics: {
    color: '#ef4444',
    tint: 'from-rose-50 via-white to-orange-50',
    description: 'Markets, incentives, policy, and the hidden logic behind everyday systems.',
  },
  'life-skills': {
    color: '#8b5cf6',
    tint: 'from-violet-50 via-white to-fuchsia-50',
    description: 'Reusable mental tools for communication, decisions, relationships, and daily life.',
  },
}

function getSubjectMeta(slug?: string | null) {
  return SUBJECT_META[slug ?? ''] ?? {
    color: '#111827',
    tint: 'from-neutral-50 via-white to-stone-50',
    description: 'Explore how different people explain the same idea from different angles.',
  }
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">{label}</p>
    </div>
  )
}

function ModeSwitch({ mode, subjectSlug }: { mode: string; subjectSlug?: string }) {
  const base = 'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all'
  return (
    <div className="inline-flex rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
      <Link
        href={`/browse?mode=topics${subjectSlug ? `&subject=${subjectSlug}` : ''}`}
        className={`${base} ${mode === 'authors' ? 'text-neutral-500 hover:text-neutral-900' : 'bg-neutral-950 text-white shadow-sm'}`}
      >
        Topics
      </Link>
      <Link
        href="/browse?mode=authors"
        className={`${base} ${mode === 'authors' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
      >
        Authors
      </Link>
    </div>
  )
}

function SortLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
        active
          ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
          : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
      }`}
    >
      {children}
    </Link>
  )
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
  const activeMeta = getSubjectMeta(activeSubject?.slug)

  const mySubjectSubResult = userId && activeSubject
    ? await supabase.from('subscriptions').select('user_id').eq('user_id', userId).eq('type', 'subject').eq('entity_id', String(activeSubject.id)).maybeSingle()
    : { data: null }
  const mySubjectSub = mySubjectSubResult.data
  const isSubjectSubscribed = !!mySubjectSub

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
      topic: { subject: { name: string; slug: string } | { name: string; slug: string }[] | null } | { subject: { name: string; slug: string } | { name: string; slug: string }[] | null }[] | null
      author: {
        id: string
        username: string
        display_name: string | null
        bio: string | null
        avatar_url: string | null
        created_at: string
      } | {
        id: string
        username: string
        display_name: string | null
        bio: string | null
        avatar_url: string | null
        created_at: string
      }[] | null
    }

    type AuthorProfile = {
      id: string
      username: string
      display_name: string | null
      bio: string | null
      avatar_url: string | null
      created_at: string
    }

    const authorMap = new Map<string, {
      profile: AuthorProfile
      topicIds: Set<string>
      subjectSlugs: Set<string>
      postCount: number
    }>()

    for (const p of (posts ?? []) as unknown as AuthorRow[]) {
      const author = Array.isArray(p.author) ? p.author[0] : p.author
      if (!author) continue
      if (!authorMap.has(p.author_id)) {
        authorMap.set(p.author_id, {
          profile: author,
          topicIds: new Set(),
          subjectSlugs: new Set(),
          postCount: 0,
        })
      }
      const entry = authorMap.get(p.author_id)!
      entry.postCount++
      entry.topicIds.add(p.topic_id)
      const topic = Array.isArray(p.topic) ? p.topic[0] : p.topic
      const subject = Array.isArray(topic?.subject) ? topic.subject[0] : topic?.subject
      const slug = subject?.slug
      if (slug) entry.subjectSlugs.add(slug)
    }

    const authorSort = sort === 'topics' ? 'topics' : sort === 'newest' ? 'newest' : 'popular'
    const authors = [...authorMap.values()].sort((a, b) => {
      if (authorSort === 'topics') return b.topicIds.size - a.topicIds.size
      if (authorSort === 'newest') return new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime()
      return b.postCount - a.postCount
    })

    const totalAuthors = authors.length
    const totalPosts = authors.reduce((sum, author) => sum + author.postCount, 0)
    const totalTopics = new Set(((posts ?? []) as { topic_id: string }[]).map(post => post.topic_id)).size

    return (
      <div className="min-h-screen flex flex-col bg-[#fbfaf7]">
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-950 px-5 py-8 text-white shadow-sm sm:px-8 sm:py-10">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-amber-200/10 blur-2xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">Browse contributors</p>
                <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  Find the people whose explanations click.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-300 sm:text-base">
                  Compare creators by breadth, depth, and the subjects they keep returning to. Follow the thinkers who make difficult ideas easier to hold.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatCard label="Authors" value={totalAuthors} />
                <StatCard label="Posts" value={totalPosts} />
                <StatCard label="Topics" value={totalTopics} />
              </div>
            </div>
          </section>

          <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <ModeSwitch mode="authors" subjectSlug={activeSubject?.slug} />
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'popular', label: 'Most contributions' },
                { value: 'topics', label: 'Most topics' },
                { value: 'newest', label: 'Newest' },
              ] as const).map(opt => (
                <SortLink key={opt.value} href={`/browse?mode=authors&sort=${opt.value}`} active={authorSort === opt.value}>
                  {opt.label}
                </SortLink>
              ))}
            </div>
          </section>

          {authors.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
              <p className="text-sm font-medium text-neutral-900">No contributors yet.</p>
              <p className="mt-2 text-sm text-neutral-500">Once people publish their first post, they will appear here.</p>
            </div>
          ) : (
            <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {authors.map(({ profile, postCount, topicIds, subjectSlugs }) => {
                const topSubjects = [...subjectSlugs].slice(0, 4)
                return (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.username}`}
                    className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-neutral-900 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-start gap-4">
                      <Avatar url={profile.avatar_url} name={profile.display_name ?? profile.username} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-semibold tracking-tight text-neutral-950">
                              {profile.display_name ?? profile.username}
                            </h2>
                            <p className="text-sm text-neutral-400">@{profile.username}</p>
                          </div>
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
                            View
                          </span>
                        </div>
                        {profile.bio ? (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-500">{profile.bio}</p>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-neutral-400">Building a library of explanations across Mind Palace.</p>
                        )}
                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4">
                          <div>
                            <p className="text-xl font-semibold text-neutral-950">{postCount}</p>
                            <p className="text-xs text-neutral-400">{postCount === 1 ? 'Contribution' : 'Contributions'}</p>
                          </div>
                          <div>
                            <p className="text-xl font-semibold text-neutral-950">{topicIds.size}</p>
                            <p className="text-xs text-neutral-400">{topicIds.size === 1 ? 'Topic' : 'Topics'}</p>
                          </div>
                        </div>
                        {topSubjects.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {topSubjects.map(slug => (
                              <span
                                key={slug}
                                className="h-2.5 w-8 rounded-full"
                                style={{ backgroundColor: getSubjectMeta(slug).color }}
                                title={slug}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </section>
          )}
        </main>
      </div>
    )
  }

  const { data: rawTopics } = activeSubject
    ? await supabase
        .from('topics')
        .select('id, title, description, created_at, posts!posts_topic_id_fkey(count)')
        .eq('subject_id', activeSubject.id)
    : { data: [] }

  const topicIds = (rawTopics ?? []).map((topic: { id: string }) => topic.id)

  const { data: topicPosts } = topicIds.length > 0
    ? await supabase
        .from('posts')
        .select('topic_id, author_id, type')
        .in('topic_id', topicIds)
        .eq('is_draft', false)
    : { data: [] }

  type TopicStats = { contributors: Set<string>; types: Set<string> }
  const statsMap: Record<string, TopicStats> = {}
  for (const post of (topicPosts ?? [])) {
    if (!statsMap[post.topic_id]) statsMap[post.topic_id] = { contributors: new Set(), types: new Set() }
    statsMap[post.topic_id].contributors.add(post.author_id)
    statsMap[post.topic_id].types.add(post.type)
  }

  type Topic = {
    id: string
    title: string
    description: string | null
    created_at: string
    postCount: number
    contributorCount: number
    types: string[]
  }

  const topics: Topic[] = (rawTopics ?? []).map((topic: {
    id: string
    title: string
    description: string | null
    created_at: string
    posts?: { count: number }[]
  }) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description,
    created_at: topic.created_at,
    postCount: topic.posts?.[0]?.count ?? 0,
    contributorCount: statsMap[topic.id]?.contributors.size ?? 0,
    types: [...(statsMap[topic.id]?.types ?? [])],
  }))

  const sorted = [...topics].sort((a, b) => {
    if (sort === 'popular') return b.postCount - a.postCount
    if (sort === 'contributors') return b.contributorCount - a.contributorCount
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const featured = [...topics]
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 3)
    .filter(topic => topic.postCount > 0)
  const featuredIds = new Set(featured.map(topic => topic.id))
  const rest = sorted.filter(topic => !featuredIds.has(topic.id))

  const subjectColor = activeMeta.color
  const totalPosts = topics.reduce((sum, topic) => sum + topic.postCount, 0)
  const totalContributors = new Set((topicPosts ?? []).map(post => post.author_id)).size

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7]">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        <section className={`relative overflow-hidden rounded-[2rem] border border-neutral-200 bg-gradient-to-br ${activeMeta.tint} px-5 py-8 shadow-sm sm:px-8 sm:py-10`}>
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-12 -translate-y-12 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: subjectColor }} />
          <div className="absolute bottom-0 left-8 h-20 w-64 rounded-full bg-white/70 blur-2xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-500 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subjectColor }} />
                {activeSubject?.name ?? 'Browse'}
              </div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
                Browse ideas by the topic they are trying to explain.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
                {activeMeta.description} Each topic gathers multiple contributions, so you can compare the explanation styles that fit your mind.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard label="Topics" value={topics.length} />
              <StatCard label="Posts" value={totalPosts} />
              <StatCard label="Authors" value={totalContributors} />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <ModeSwitch mode="topics" subjectSlug={activeSubject?.slug} />
            <div className="flex flex-wrap gap-2">
              {subjects?.map((subject: { id: number; name: string; slug: string }) => {
                const meta = getSubjectMeta(subject.slug)
                const active = subject.id === activeSubject?.id
                return (
                  <Link
                    key={subject.slug}
                    href={`/browse?subject=${subject.slug}&mode=topics`}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-900'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#fff' : meta.color }} />
                    {subject.name}
                  </Link>
                )
              })}
            </div>
          </div>
          {activeSubject && (
            <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-500">
                Follow <span className="font-medium text-neutral-900">{activeSubject.name}</span> to keep this corner of the palace close.
              </p>
              <SubscribeButton
                type="subject"
                entityId={String(activeSubject.id)}
                userId={userId}
                initialSubscribed={isSubjectSubscribed}
                label={activeSubject.name}
              />
            </div>
          )}
        </section>

        {topics.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
            <p className="text-sm font-medium text-neutral-900">No topics yet in this subject.</p>
            <p className="mt-2 text-sm text-neutral-500">Start the first shared question and let others add their take.</p>
            <Link href="/create" className="mt-5 inline-flex rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700">
              Create a topic
            </Link>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mt-10">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Featured pathways</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">Most active topics in {activeSubject?.name}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {featured.map((topic, index) => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="group flex min-h-72 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between px-5 pt-5">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="h-8 w-8 rounded-full" style={{ backgroundColor: subjectColor }} />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="text-lg font-semibold leading-snug tracking-tight text-neutral-950 group-hover:text-neutral-700">{topic.title}</h3>
                        {topic.description ? (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-500">
                            {extractPlainText(topic.description)}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-neutral-400">A shared topic waiting for more perspectives.</p>
                        )}
                        <div className="mt-auto pt-6">
                          <div className="mb-4 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-2xl font-semibold text-neutral-950">{topic.postCount}</p>
                              <p className="text-xs text-neutral-400">contributions</p>
                            </div>
                            <div>
                              <p className="text-2xl font-semibold text-neutral-950">{topic.contributorCount}</p>
                              <p className="text-xs text-neutral-400">contributors</p>
                            </div>
                          </div>
                          {topic.types.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {topic.types.map(type => (
                                <TypeBadge key={type} type={type} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">
                    {featured.length > 0 ? 'Complete index' : 'Topic index'}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">
                    {rest.length} {rest.length === 1 ? 'topic' : 'topics'} to explore
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'newest', label: 'Newest' },
                    { value: 'popular', label: 'Most contributions' },
                    { value: 'contributors', label: 'Most contributors' },
                  ] as const).map(opt => (
                    <SortLink
                      key={opt.value}
                      href={`/browse?subject=${activeSubject?.slug ?? ''}&sort=${opt.value}&mode=topics`}
                      active={sort === opt.value}
                    >
                      {opt.label}
                    </SortLink>
                  ))}
                </div>
              </div>

              {rest.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
                  <p className="text-sm text-neutral-500">The featured topics above are the whole set for now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {rest.map(topic => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="group rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
                            <span className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                              {activeSubject?.name}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold leading-snug tracking-tight text-neutral-950 group-hover:text-neutral-700">{topic.title}</h3>
                          {topic.description && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">
                              {extractPlainText(topic.description)}
                            </p>
                          )}
                          {topic.types.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {topic.types.map(type => (
                                <TypeBadge key={type} type={type} />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:w-44">
                          <div className="rounded-2xl bg-neutral-50 px-3 py-3 text-center">
                            <p className="text-lg font-semibold text-neutral-950">{topic.postCount}</p>
                            <p className="text-[11px] text-neutral-400">posts</p>
                          </div>
                          <div className="rounded-2xl bg-neutral-50 px-3 py-3 text-center">
                            <p className="text-lg font-semibold text-neutral-950">{topic.contributorCount}</p>
                            <p className="text-[11px] text-neutral-400">authors</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
