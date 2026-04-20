import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('pdf') as File | null

  if (!file || file.type !== 'application/pdf') {
    return Response.json({ error: 'Please upload a valid PDF file.' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'PDF must be under 10 MB.' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()

  // Validate magic bytes — browser MIME type is untrustworthy
  const magic = new Uint8Array(buffer.slice(0, 5))
  const isPdf = magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46 && magic[4] === 0x2D
  if (!isPdf) {
    return Response.json({ error: 'File does not appear to be a valid PDF.' }, { status: 400 })
  }

  const base64 = Buffer.from(buffer).toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Extract the key knowledge from this document and structure it as a Mind Palace post draft.

Return a JSON object with exactly this shape:
{
  "title": "A clear, specific title for the post (not the document title — a knowledge title)",
  "type": "solution" | "framework" | "concept" | "process",
  "content": [tiptap paragraph nodes]
}

Rules for content:
- Use only {"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"..."}]} nodes
- Write 4–8 paragraphs capturing the core ideas, key insights, and any notable frameworks or steps
- Preserve important terminology and specific claims from the document
- Write in first-person as if the user is sharing what they learned
- Do not include citations, page numbers, or references to "the document"
- Keep each paragraph focused and readable

Return only valid JSON, no markdown, no explanation.`,
          },
        ],
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(raw.trim())
    return Response.json(parsed)
  } catch {
    // Claude returned something non-JSON — try to extract JSON block
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return Response.json(JSON.parse(match[0]))
      } catch {
        // fall through
      }
    }
    return Response.json({ error: 'Could not parse extracted content. Try again.' }, { status: 500 })
  }
}
