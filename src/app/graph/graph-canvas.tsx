'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ForceGraph2D from 'react-force-graph-2d'

const SUBJECT_COLORS: Record<string, string> = {
  'productivity':     '#6366f1',
  'personal-finance': '#10b981',
  'career':           '#f59e0b',
  'economics':        '#ef4444',
  'life-skills':      '#8b5cf6',
}

type Node = {
  id: string
  title: string
  subjectSlug: string
  postCount: number
}

type Link = {
  source: string
  target: string
}

export function GraphCanvas({ nodes, links }: { nodes: Node[]; links: Link[] }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const getNodeColor = useCallback((node: Node) => {
    return SUBJECT_COLORS[node.subjectSlug] ?? '#a3a3a3'
  }, [])

  const getNodeSize = useCallback((node: Node) => {
    return Math.max(4, Math.min(12, 4 + node.postCount * 2))
  }, [])

  const handleNodeClick = useCallback((node: Node) => {
    router.push(`/topics/${node.id}`)
  }, [router])

  const paintNode = useCallback((node: Node & { x: number; y: number }, ctx: CanvasRenderingContext2D) => {
    const size = getNodeSize(node)
    const color = getNodeColor(node)

    // Glow
    ctx.beginPath()
    ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI)
    ctx.fillStyle = color + '30'
    ctx.fill()

    // Node
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    // Label
    ctx.font = '3px Inter, sans-serif'
    ctx.fillStyle = '#e5e5e5'
    ctx.textAlign = 'center'
    ctx.fillText(node.title.length > 30 ? node.title.slice(0, 30) + '…' : node.title, node.x, node.y + size + 4)
  }, [getNodeColor, getNodeSize])

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        graphData={{ nodes, links }}
        backgroundColor="#0a0a0a"
        nodeCanvasObject={paintNode as never}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick as never}
        linkColor={() => '#333333'}
        linkWidth={1}
        nodeLabel={(node) => (node as Node).title}
        cooldownTicks={100}
        width={containerRef.current?.clientWidth ?? window.innerWidth}
        height={containerRef.current?.clientHeight ?? window.innerHeight - 56}
      />
    </div>
  )
}
