"use client"
import { Suspense, useEffect, useState } from "react"
import { beansAPI, tastingsAPI, authAPI, APIError } from "@/lib/api"
import type { BeanBatch, FlavorNote } from "@/lib/types"
import { useSearchParams, useRouter } from "next/navigation"
import { SelectBox } from "@/components/ui/selectbox"
import { TagInput } from "@/components/ui/tag-input"

const scoreOptions = [1,2,3,4,5,6,7,8,9,10]

function NewTastingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [beans, setBeans] = useState<BeanBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ bean_batch_id: "", liking: 6, aroma: 6, sourness: 5, bitterness: 4, sweetness: 5, body: 5, aftertaste: 5, comment: "" })
  const [tags, setTags] = useState<string[]>([])
  const [selectedBean, setSelectedBean] = useState<BeanBatch | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [isFinishFlow, setIsFinishFlow] = useState(false)

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const { user } = await authAPI.getUser()
      if (!user) {
        // ログインしていない場合はログインページにリダイレクト
        router.push('/login')
        return
      }
      setAuthChecking(false)
      load()
    } catch (err) {
      // 認証エラーの場合もログインページにリダイレクト
      router.push('/login')
    }
  }

  // Preselect by query param: ?bean=ID and load existing tasting data
  useEffect(() => {
    const q = searchParams?.get('bean')
    const finishParam = searchParams?.get('finish')

    if (finishParam === 'true') {
      setIsFinishFlow(true)
    }

    if (!q) return

    const ensureBean = async () => {
      const existing = beans.find(b => b.id === q)
      if (existing) {
        applyBeanSelection(existing)
        return
      }

      try {
        const beanData = await beansAPI.getById(q)
        setBeans(prev => {
          if (prev.some(b => b.id === beanData.id)) return prev
          return [beanData, ...prev]
        })
        applyBeanSelection(beanData)
      } catch (err) {
        console.error('Failed to fetch bean for tasting edit:', err)
      }
    }

    ensureBean()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beans.length])

  const applyBeanSelection = (bean: BeanBatch) => {
    setSelectedBean(bean)
    setForm(prev => ({ ...prev, bean_batch_id: bean.id }))

    if (bean.liking && !isFinishFlow) {
      setIsEditMode(true)
      setForm({
        bean_batch_id: bean.id,
        liking: bean.liking,
        aroma: bean.aroma || 6,
        sourness: bean.sourness || 5,
        bitterness: bean.bitterness || 4,
        sweetness: bean.sweetness || 5,
        body: bean.body || 5,
        aftertaste: bean.aftertaste || 5,
        comment: bean.tasting_comment || ""
      })

      ;(async () => {
        try {
          const beanData = await beansAPI.getById(bean.id)
          setTags(beanData.flavorNotes || [])
        } catch (err) {
          console.error('Failed to load flavor notes:', err)
        }
      })()
    }
  }

  async function load() {
    try {
      setLoading(true)
      const data = await beansAPI.getAll({ archived: false, limit: 200 })
      setBeans(data || [])
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('データの読み込みに失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.bean_batch_id) { setError('豆を選択してください'); return }

    try {
      const tastingData = {
        bean_batch_id: form.bean_batch_id,
        liking: Number(form.liking),
        aroma: Number(form.aroma),
        sourness: Number(form.sourness),
        bitterness: Number(form.bitterness),
        sweetness: Number(form.sweetness),
        body: Number(form.body),
        aftertaste: Number(form.aftertaste),
        comment: form.comment || null,
        flavorNotes: tags,
      }

      await tastingsAPI.save(tastingData)

      // 飲み終わりフローの場合は自動的にアーカイブ
      if (isFinishFlow && selectedBean) {
        try {
          await beansAPI.update(selectedBean.id, { archived: true })
          alert('テイスティングを記録し、豆を飲み終わりとして登録しました')
          // 豆詳細ページに戻る
          router.push(`/beans/${selectedBean.id}`)
          return
        } catch (err) {
          console.error('Archive failed:', err)
          alert('テイスティングは記録されましたが、飲み終わり登録に失敗しました。')
        }
      } else {
        alert(isEditMode ? 'テイスティング情報を更新しました' : 'テイスティングを記録しました')
      }

      if (selectedBean || form.bean_batch_id) {
        router.push(`/beans/${selectedBean?.id || form.bean_batch_id}`)
        return
      }

      // Refresh fallback
      load()
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('保存に失敗しました')
      }
    }
  }

  if (authChecking) return <p className="text-muted-foreground">認証確認中...</p>
  if (loading) return <p className="text-muted-foreground">読み込み中...</p>

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isFinishFlow
            ? '飲み終わり記録 - テイスティング'
            : isEditMode
              ? 'テイスティング情報を編集'
              : 'テイスティングを記録'
          }
        </h1>
        {selectedBean && (
          <div className="text-sm text-muted-foreground">
            対象の豆: {selectedBean.name}
            {selectedBean.current_weight_g !== null && selectedBean.current_weight_g !== undefined && (
              <span className="ml-2">
                （残り: {selectedBean.current_weight_g}g）
                {selectedBean.current_weight_g <= 50 && (
                  <span className="text-amber-600 ml-1">⚠️ 残り少なめ</span>
                )}
              </span>
            )}
            {isFinishFlow && (
              <div className="text-amber-600 mt-1">
                ⚠️ この豆を飲み終わりとして記録します
              </div>
            )}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="grid gap-3 max-w-xl">
        <label className="grid gap-1 text-sm">豆
          <SelectBox
            value={form.bean_batch_id}
            onChange={(v)=>setForm({ ...form, bean_batch_id: v })}
            options={beans.map(b => ({ value: b.id, label: b.name }))}
            placeholder="豆を選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">好き度
          <SelectBox
            value={String(form.liking)}
            onChange={(v)=>setForm({ ...form, liking: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">香り
          <SelectBox
            value={String(form.aroma)}
            onChange={(v)=>setForm({ ...form, aroma: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">酸っぱさ
          <SelectBox
            value={String(form.sourness)}
            onChange={(v)=>setForm({ ...form, sourness: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">苦さ
          <SelectBox
            value={String(form.bitterness)}
            onChange={(v)=>setForm({ ...form, bitterness: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">甘み
          <SelectBox
            value={String(form.sweetness)}
            onChange={(v)=>setForm({ ...form, sweetness: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">ボディ
          <SelectBox
            value={String(form.body)}
            onChange={(v)=>setForm({ ...form, body: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <label className="grid gap-1 text-sm">後味
          <SelectBox
            value={String(form.aftertaste)}
            onChange={(v)=>setForm({ ...form, aftertaste: Number(v) as any })}
            options={scoreOptions.map(s => ({ value: String(s), label: String(s) }))}
            placeholder="選択してください"
          />
        </label>
        <div className="grid gap-1 text-sm">
          <label htmlFor="flavor-notes">フレーバーノート</label>
          <TagInput inputId="flavor-notes" value={tags} onChange={setTags} placeholder="チョコ / ナッツ / ベリー" />
        </div>
        <label className="grid gap-1 text-sm">
          コメント
          <textarea
            className="w-full min-h-24 rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
            value={form.comment}
            placeholder="メモや感想を入力"
            onChange={(e)=>setForm({ ...form, comment: e.target.value })}
          />
        </label>
        <button className="w-full inline-flex items-center justify-center h-12 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {isFinishFlow ? '飲み終わりとして記録' : isEditMode ? '更新' : '保存'}
        </button>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </form>
    </div>
  )
}

export default function NewTastingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">パラメータ読み込み中...</p>}>
      <NewTastingPageContent />
    </Suspense>
  )
}
