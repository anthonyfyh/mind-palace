'use client'

import { useState } from 'react'

export function TopicDigest({ topicId, postCount }: { topicId: string; postCount: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [text, setText] = useState('')

  if (postCount < 2) return null

  async function generate() {
    setState('loading')
    setText('')

    const res = await fetch(`/api/digest/${topicId}`)
    if (!res.ok || !res.body) { setState('error'); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    setState('done')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setText(prev => prev + decoder.decode(value, { stream: true }))
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <SparkleIcon />
          <span className="text-sm font-medium text-neutral-700">AI Digest</span>
          <span className="text-xs text-neutral-400">Synthesized from {postCount} perspectives</span>
        </div>
        {state === 'idle' && (
          <button
            onClick={generate}
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition-colors"
          >
            Generate
          </button>
        )}
        {state === 'loading' && (
          <span className="text-xs text-neutral-400 animate-pulse">Thinking…</span>
        )}
        {(state === 'done' || state === 'error') && (
          <button
            onClick={generate}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {state === 'idle' && (
        <div className="px-5 py-4">
          <p className="text-sm text-neutral-400">
            Generate an AI-synthesized overview of all perspectives on this topic.
          </p>
        </div>
      )}

      {(state === 'loading' || state === 'done') && text && (
        <div className="px-5 py-4">
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {text}
            {state === 'loading' && <span className="inline-block w-0.5 h-4 bg-neutral-400 ml-0.5 animate-pulse align-middle" />}
          </p>
        </div>
      )}

      {state === 'loading' && !text && (
        <div className="px-5 py-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="px-5 py-4">
          <p className="text-sm text-red-500">Something went wrong. Try again.</p>
        </div>
      )}
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
      <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69H21l-4.94 3.59a1 1 0 0 0-.36 1.12L17.59 20 12 16.41 6.41 20l1.89-5.84a1 1 0 0 0-.36-1.12L3 9.45h6.17a1 1 0 0 0 .95-.69L12 3z" />
    </svg>
  )
}
