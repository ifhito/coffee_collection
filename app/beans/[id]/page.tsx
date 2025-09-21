"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { beansAPI, authAPI, APIError } from "@/lib/api"
import type { BeanBatch, Shop } from "@/lib/types"

export default function BeanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined)
  const [bean, setBean] = useState<BeanBatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [origins, setOrigins] = useState<string[]>([])
  const [flavorNotes, setFlavorNotes] = useState<string[]>([])
  const [roasterShop, setRoasterShop] = useState<Shop | null>(null)
  const [purchaseShop, setPurchaseShop] = useState<Shop | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  useEffect(() => {
    if (!id) return
    checkAuthStatus()
    loadBeanData()
  }, [id])

  const checkAuthStatus = async () => {
    try {
      const { user } = await authAPI.getUser()
      setIsLoggedIn(!!user)
    } catch (err) {
      setIsLoggedIn(false)
    }
  }

  const loadBeanData = async () => {
    try {
      setLoading(true)
      const beanData = await beansAPI.getById(id!)

      setBean(beanData)
      setOrigins(beanData.origins || [])
      setFlavorNotes(beanData.flavorNotes || [])
      setRoasterShop(beanData.roasterShop || null)
      setPurchaseShop(beanData.purchaseShop || null)
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


  const startFinishFlow = () => {
    if (!bean) return
    // 飲み終わりフローでテイスティング画面に遷移
    router.push(`/tastings/new?bean=${bean.id}&finish=true`)
  }

  const deleteBean = async () => {
    if (!bean) return
    if (!confirm(`「${bean.name}」を完全に削除しますか？この操作は取り消せません。`)) return

    try {
      await beansAPI.delete(bean.id)
      router.push("/beans")
    } catch (err) {
      if (err instanceof APIError) {
        alert(`削除に失敗しました: ${err.message}`)
      } else {
        alert('削除に失敗しました')
      }
    }
  }

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>
  if (!bean) return <div className="text-muted-foreground">データが見つかりませんでした。</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{bean.name}</h1>
          <div className="text-sm text-muted-foreground">
            {[roasterShop?.name, bean.roast_level].filter(Boolean).join(' ・ ')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">在庫</div>
          <div className="text-xl font-medium">{bean.current_weight_g ?? 0} g</div>
        </div>
      </div>

      {isLoggedIn && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/beans/${bean.id}/edit`} className="inline-flex items-center justify-center h-10 px-3 rounded-md border hover:bg-accent hover:text-accent-foreground">編集</Link>
          {!bean.archived && (
            <button onClick={startFinishFlow} className="inline-flex items-center justify-center h-10 px-3 rounded-md text-destructive hover:bg-destructive/10 border">飲み終わった</button>
          )}
          <button onClick={deleteBean} className="inline-flex items-center justify-center h-10 px-3 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90">削除</button>
        </div>
      )}

      <section className="rounded-xl border bg-card">
        <div className="px-6 pt-6">
          <h2 className="text-base font-medium">詳細</h2>
        </div>
        <div className="px-6 pb-6">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {origins.length > 0 ? (
              <div>
                <dt className="text-xs text-muted-foreground">産地</dt>
                <dd>{origins.join(', ')}</dd>
              </div>
            ) : bean.origin_country ? (
              <div>
                <dt className="text-xs text-muted-foreground">産地</dt>
                <dd>{bean.origin_country}</dd>
              </div>
            ) : null}
            {roasterShop && (
              <div>
                <dt className="text-xs text-muted-foreground">ロースター</dt>
                <dd>{roasterShop.name}</dd>
              </div>
            )}
            {purchaseShop && (
              <div>
                <dt className="text-xs text-muted-foreground">購入店舗</dt>
                <dd>{purchaseShop.name}</dd>
              </div>
            )}
            {bean.farm && (
              <div>
                <dt className="text-xs text-muted-foreground">農園</dt>
                <dd>{bean.farm}</dd>
              </div>
            )}
            {bean.variety && (
              <div>
                <dt className="text-xs text-muted-foreground">品種</dt>
                <dd>{bean.variety}</dd>
              </div>
            )}
            {bean.process && (
              <div>
                <dt className="text-xs text-muted-foreground">精製方法</dt>
                <dd>{bean.process}</dd>
              </div>
            )}
            {bean.roast_date && (
              <div>
                <dt className="text-xs text-muted-foreground">焙煎日</dt>
                <dd>{bean.roast_date}</dd>
              </div>
            )}
            {bean.initial_weight_g != null && (
              <div>
                <dt className="text-xs text-muted-foreground">初期量[g]</dt>
                <dd>{bean.initial_weight_g}</dd>
              </div>
            )}
            {bean.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">メモ</dt>
                <dd className="whitespace-pre-wrap leading-relaxed">{bean.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {(bean.liking || bean.tasting_comment || flavorNotes.length > 0) && (
        <section className="rounded-xl border bg-card">
          <div className="px-6 pt-6">
            <h2 className="text-base font-medium">テイスティング</h2>
          </div>
          <div className="px-6 pb-6">
            {bean.liking ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>好き度: ⭐ {bean.liking}</span>
                      {bean.aroma != null && <span>香り: {bean.aroma}</span>}
                      {bean.sourness != null && <span>酸味: {bean.sourness}</span>}
                      {bean.bitterness != null && <span>苦味: {bean.bitterness}</span>}
                    </div>
                    {(bean.sweetness != null || bean.body != null || bean.aftertaste != null) && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {bean.sweetness != null && <span>甘み: {bean.sweetness}</span>}
                        {bean.body != null && <span>ボディ: {bean.body}</span>}
                        {bean.aftertaste != null && <span>後味: {bean.aftertaste}</span>}
                      </div>
                    )}
                    {flavorNotes.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        フレーバー: {flavorNotes.join(', ')}
                      </div>
                    )}
                    {bean.tasting_comment && (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{bean.tasting_comment}</div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {bean.tasted_at && new Date(bean.tasted_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">まだテイスティングが記録されていません</div>
            )}
            {!isLoggedIn && (
              <div className="mt-4 text-xs text-muted-foreground">編集する場合はサインインしてください。</div>
            )}
          </div>
        </section>
      )}

      <div>
        <Link href="/beans" className="text-sm text-primary underline">← 豆一覧に戻る</Link>
      </div>
    </div>
  )
}
