"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase/client"

type TastingRow = {
  id: string
  liking: number
  created_at: string
  brew_id: string
}

export default function VizPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [points, setPoints] = useState<TastingRow[]>([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data, error } = await supabase.from('tastings').select('id, liking, created_at, brew_id').order('created_at', { ascending: false }).limit(500)
        if (!error) setPoints((data as TastingRow[]) || [])
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.scale(dpr, dpr)
    // draw simple radial constellation: points randomly on ring based on liking
    ctx.clearRect(0,0,width,height)
    const cx = width/2, cy = height/2
    const R = Math.min(width, height) * 0.45
    // rings
    ctx.strokeStyle = '#eee'
    for (let i=1;i<=5;i++) {
      ctx.beginPath()
      ctx.arc(cx, cy, (R/5)*i, 0, Math.PI*2)
      ctx.stroke()
    }
    // points
    points.forEach((p, idx) => {
      const ring = Math.max(1, Math.min(5, p.liking))
      const r = (R/6) + (R/5)*ring
      const angle = (idx * 137.508) % 360 // golden angle
      const rad = angle * Math.PI/180
      const x = cx + Math.cos(rad) * r
      const y = cy + Math.sin(rad) * r
      const size = 2 + ring // size by liking
      ctx.beginPath()
      ctx.fillStyle = `hsl(${220 - ring*20} 70% 45%)`
      ctx.arc(x, y, size, 0, Math.PI*2)
      ctx.fill()
    })
  }, [points])

  if (loading) return <p>読み込み中...</p>
  if (!userId) return <p><a href="/">サインイン</a>してください。</p>

  return (
    <div>
      <h1>コンステレーション（簡易）</h1>
      <div style={{ color: '#666', marginBottom: 8 }}>好き度が外周ほど大きくなる簡易表示です。</div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 420, display: 'block' }} />
      </div>
    </div>
  )
}

