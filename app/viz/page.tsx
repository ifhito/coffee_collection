"use client"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { beansAPI, authAPI, APIError } from "@/lib/api"
import type { BeanBatch } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { SelectBox } from "@/components/ui/selectbox"

// Note: Using bean data with integrated tasting information instead of separate tasting table

function VizPageContent() {
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [beans, setBeans] = useState<BeanBatch[]>([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [primaryColor, setPrimaryColor] = useState<string>('#111827')
  const [mutedForeground, setMutedForeground] = useState<string>('#6b7280')
  const [beanFilter, setBeanFilter] = useState<string>("")

  useEffect(() => {
    // ユーザー状態を取得しつつ、ログイン不要でデータを読み込み
    loadUserData()

    // 豆とテイスティングデータをログイン不要で取得
    loadVisualizationData()
  }, [])

  const loadUserData = async () => {
    try {
      const { user: userData } = await authAPI.getUser()
      setUserId(userData?.id ?? null)
    } catch (err) {
      // ログインしていない場合はエラーにしない
      setUserId(null)
    }
  }

  const loadVisualizationData = async () => {
    setLoading(true)
    try {
      const beansData = await beansAPI.getAll({ limit: 1000 })
      const bs = (beansData as BeanBatch[]) || []
      setBeans(bs)
      // auto-select when only one bean exists
      if (bs.length === 1) setBeanFilter(bs[0].id)
    } catch (error) {
      // 認証エラーの場合でもデータを表示するため、エラーをログに記録するだけ
      console.error('可視化データの読み込みエラー:', error)
      // 401エラー以外の場合のみエラーメッセージを表示（必要に応じて）
    }
    setLoading(false)
  }

  // Preselect filter from query param
  useEffect(() => {
    const q = searchParams?.get('bean')
    if (q) setBeanFilter(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter beans with tasting data
  const beansWithTasting = useMemo(() => {
    return beans.filter(b => b.liking !== null && b.liking !== undefined)
  }, [beans])

  // Filter by selected bean
  const filteredBeans = useMemo(() => {
    if (!beanFilter) return beansWithTasting
    return beansWithTasting.filter(b => b.id === beanFilter)
  }, [beansWithTasting, beanFilter])

  const drawData = useMemo(() => {
    // Convert bean data to visualization format
    const source = beanFilter ? filteredBeans : beansWithTasting
    return source.map(bean => ({
      id: bean.id,
      bean_batch_id: bean.id,
      created_at: bean.tasted_at || bean.updated_at,
      liking: bean.liking || 0,
    }))
  }, [beanFilter, filteredBeans, beansWithTasting])

  // draw using CSS variables for colors, and redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const ctx = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // read CSS variables from canvas
      const styles = getComputedStyle(canvas)
      const varOr = (name: string, fallback: string) => (styles.getPropertyValue(name).trim() || fallback)
      const colorBorder = varOr('--border', '#e5e7eb')
      const colorMuted = varOr('--muted-foreground', '#6b7280')
      const colorPrimary = varOr('--primary', '#111827')

      // store for legend
      setPrimaryColor(colorPrimary)
      setMutedForeground(colorMuted)

      // background is transparent to let card color show through
      ctx.clearRect(0, 0, width, height)
      const cx = width / 2, cy = height / 2
      const R = Math.min(width, height) * 0.4

      // axes
      ctx.save()
      ctx.strokeStyle = colorBorder
      ctx.lineWidth = 1
      const axes = 5
      for (let a = 0; a < axes; a++) {
        const ang = (a / axes) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R)
        ctx.stroke()
      }
      ctx.restore()

      // rings
      ctx.save()
      ctx.strokeStyle = colorBorder
      ctx.fillStyle = colorMuted
      ctx.lineWidth = 1
      ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
      for (let i = 1; i <= 10; i++) {
        const r = (R / 10) * i
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        // ring labels (show only every 2 rings to avoid clutter)
        if (i % 2 === 0) {
          const tx = cx + r + 6
          const ty = cy + 4
          ctx.fillText(String(i), tx, ty)
        }
      }
      ctx.restore()

      // points (golden-angle placement on each ring)
      ctx.save()
      drawData.forEach((p, idx) => {
        const ring = Math.max(1, Math.min(10, Math.floor(p.liking)))
        const r = (R / 10) * ring // 各リングの位置
        const angle = (idx * 137.508) % 360 // golden angle
        const rad = (angle * Math.PI) / 180
        const x = cx + Math.cos(rad) * r
        const y = cy + Math.sin(rad) * r
        const size = 3 + ring * 0.5

        ctx.beginPath()
        ctx.fillStyle = colorPrimary
        ctx.globalAlpha = 0.6 + ring * 0.08
        ctx.shadowColor = colorPrimary
        ctx.shadowBlur = 4
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()

      // center dot
      ctx.beginPath()
      ctx.globalAlpha = 1
      ctx.fillStyle = colorMuted
      ctx.arc(cx, cy, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    draw()

    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [drawData])

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">コンステレーション（簡易）</h1>
      <div className="text-sm text-muted-foreground">好き度が外周ほど大きくなる簡易表示です。</div>
      <div ref={containerRef} className="rounded-xl border bg-card">
        <div className="px-6 pt-6 space-y-3">
          {/* デバッグ情報 */}
          <div className="text-xs text-muted-foreground">
            データ: {beansWithTasting.length}件の豆（テイスティング済み） / {beans.length}件の豆全体, 表示中: {drawData.length}件
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              <label className="flex flex-col gap-1">
                <span className="text-xs">豆:</span>
                <SelectBox
                  value={beanFilter}
                  onChange={setBeanFilter}
                  options={[
                    { value: "", label: "すべて" },
                    ...beans.map(b => ({
                      value: b.id,
                      label: `${b.name}${(b as any).archived ? ' [飲み終わった]' : ''}`
                    }))
                  ]}
                  placeholder="すべて"
                />
              </label>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>凡例:</span>
              {[2,4,6,8,10].map((lvl) => (
                <span key={lvl} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5">
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: primaryColor, opacity: 0.6 + lvl * 0.04 }}
                  />
                  {lvl}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-lg border overflow-hidden">
            <canvas ref={canvasRef} className="block w-full" style={{ height: 'min(60vh, 420px)' as any }} />
          </div>
          {beanFilter && filteredBeans.length === 0 && (
            <div className="mt-2 text-xs text-muted-foreground">選択した豆にはテイスティング情報がありません。</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VizPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">パラメータ読み込み中...</p>}>
      <VizPageContent />
    </Suspense>
  )
}
