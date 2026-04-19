import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

function extractPlainText(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  try {
    const texts: string[] = []
    function walk(node: { text?: string; content?: unknown[] }) {
      if (node.text) texts.push(node.text)
      node.content?.forEach(c => walk(c as { text?: string; content?: unknown[] }))
    }
    walk(raw as { text?: string; content?: unknown[] })
    return texts.join(' ').trim()
  } catch {
    return ''
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params
  const supabase = await createClient()

  const [{ data: topic }, { data: posts }] = await Promise.all([
    supabase.from('topics').select('title').eq('id', topicId).single(),
    supabase
      .from('posts')
      .select('title, type, content, author:profiles(display_name, username)')
      .eq('topic_id', topicId)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  if (!topic || !posts || posts.length < 2) {
    return new Response('Not enough posts to generate a digest.', { status: 400 })
  }

  const postSummaries = posts.map((p: {
    title: string; type: string; content: unknown
    author: { display_name: string | null; username: string } | null
  }, i: number) => {
    const text = extractPlainText(p.content)
    const author = p.author?.display_name ?? p.author?.username ?? 'Anonymous'
    return `[${i + 1}] "${p.title}" (${p.type}) by ${author}\n${text ? text.slice(0, 600) : '(no body text)'}`
  }).join('\n\n---\n\n')

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `You are a knowledge synthesizer for Mind Palace, a platform where multiple people contribute their unique perspectives on the same topic. Your job is to write a concise, insightful digest that helps readers understand the landscape of thinking on a topic before diving in.

Write in clear, flowing prose — no bullet points, no headers. 3–4 short paragraphs. Focus on:
- What the contributors collectively understand about this topic
- Where perspectives differ or complement each other
- What makes this topic worth exploring across multiple takes

Be specific, reference actual ideas from the posts, and keep it under 250 words.`,
    messages: [
      {
        role: 'user',
        content: `Topic: "${topic.title}"\n\nHere are the contributions:\n\n${postSummaries}\n\nWrite a digest synthesizing these perspectives.`,
      },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
