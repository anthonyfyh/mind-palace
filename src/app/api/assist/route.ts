import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkAiQuota } from '@/lib/ai-quota'

const client = new Anthropic()

function extractPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: string; content?: unknown[] }
  const texts: string[] = []
  if (n.text) texts.push(n.text)
  n.content?.forEach(c => texts.push(extractPlainText(c)))
  return texts.join(' ').trim()
}

const PROMPTS: Record<string, string> = {
  expand: `You are helping a knowledge contributor on Mind Palace expand their writing. Take the provided content and elaborate on it with more depth, concrete examples, and additional insight. Keep the author's voice and perspective. Aim for roughly 1.5–2x the original length.`,

  improve: `You are helping a knowledge contributor on Mind Palace improve their writing. Rewrite the content to be clearer, more compelling, and better structured. Fix flow issues, sharpen word choices, and make each idea land more precisely. Keep the same meaning and the author's voice.`,

  simplify: `You are helping a knowledge contributor on Mind Palace simplify their writing. Rewrite the content to be more accessible — shorter sentences, plain language, no unnecessary jargon. The core ideas should stay intact but be easier to grasp on first read.`,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  const allowed = await checkAiQuota(supabase, user.id)
  if (!allowed) return Response.json({ error: 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 })

  const { content, action } = await req.json()

  if (!content || !action || !PROMPTS[action]) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const plainText = extractPlainText(content)
  if (!plainText.trim()) {
    return Response.json({ error: 'Nothing to work with — write something first.' }, { status: 400 })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: PROMPTS[action],
    messages: [
      {
        role: 'user',
        content: `Here is the current content:\n\n${plainText}\n\nReturn only a JSON array of Tiptap paragraph nodes with this exact shape — no markdown, no explanation:\n[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"..."}]}]`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  try {
    const nodes = JSON.parse(raw)
    return Response.json({ type: 'doc', content: nodes })
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        return Response.json({ type: 'doc', content: JSON.parse(match[0]) })
      } catch { /* fall through */ }
    }
    return Response.json({ error: 'Could not parse result. Try again.' }, { status: 500 })
  }
}
