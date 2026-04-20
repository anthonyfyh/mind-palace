import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  const { description } = await req.json()

  if (!description?.trim()) {
    return Response.json({ error: 'Please describe what you want to diagram.' }, { status: 400 })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Generate a Mermaid diagram for the following description. Return ONLY valid Mermaid syntax — no explanation, no markdown code fences, no comments.

Choose the most appropriate diagram type:
- flowchart TD — for processes and decision flows
- sequenceDiagram — for interactions between parties over time
- graph LR — for concept relationships (left to right)
- mindmap — for hierarchical idea breakdowns

Keep it concise (6–12 nodes max). Use clear, short labels.

Description: ${description.trim()}`,
      },
    ],
  })

  const code = response.content[0].type === 'text'
    ? response.content[0].text.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
    : ''

  if (!code) {
    return Response.json({ error: 'Could not generate diagram. Try a clearer description.' }, { status: 500 })
  }

  return Response.json({ code })
}
