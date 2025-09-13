"use client"
import { beansAPI, authAPI, APIError } from "@/lib/api"
import { useEffect, useState } from "react"
import Link from "next/link"
import type { BeanBatch } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  const [user, setUser] = useState<any>(null)
  const [beans, setBeans] = useState<BeanBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // ユーザー認証状態を取得
    loadUserData()

    // 豆とテイスティング情報を取得（ログイン不要）
    loadDashboardData()
  }, [])

  const loadUserData = async () => {
    try {
      console.log('Loading user data...')
      const { user: userData } = await authAPI.getUser()
      console.log('User data loaded:', userData)
      setUser(userData)
    } catch (err) {
      console.log('Failed to load user data:', err)
      // ログインしていない場合はエラーにしない
      setUser(null)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    setError("")
    try {
      const beansData = await beansAPI.getAll({ limit: 100 })
      setBeans(beansData || [])
    } catch (err) {
      // 認証エラーの場合でもデータを表示するため、エラーをログに記録するだけ
      console.error('ダッシュボードデータの読み込みエラー:', err)
      if (err instanceof APIError && err.status !== 401) {
        setError(err.message)
      } else if (!(err instanceof APIError)) {
        setError('データの読み込み中にエラーが発生しました')
      }
      // 401エラー（認証エラー）の場合はエラーメッセージを表示しない
    }
    setLoading(false)
  }

  const signOut = async () => {
    try {
      await authAPI.logout()
      setUser(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const activeBeans = beans.filter(b => !b.archived)
  const finishedBeans = beans.filter(b => b.archived)
  const totalBeans = beans.length
  const activeTotalWeight = activeBeans.reduce((sum, b) => sum + (b.current_weight_g || 0), 0)

  // 統合されたテイスティング情報から平均好き度を計算
  const beansWithTasting = beans.filter(b => b.liking)
  const avgLiking = beansWithTasting.length ? (beansWithTasting.reduce((s, b) => s + (b.liking || 0), 0) / beansWithTasting.length) : 0

  // 最近テイスティングした豆（tasted_atでソート）
  const recentTastings = beansWithTasting
    .filter(b => b.tasted_at)
    .sort((a, b) => new Date(b.tasted_at!).getTime() - new Date(a.tasted_at!).getTime())
    .slice(0, 3)

  // 高評価の豆トップ3
  const topRated = beansWithTasting
    .sort((a, b) => (b.liking || 0) - (a.liking || 0))
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">ダッシュボード</h1>
        {user ? (
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="text-sm text-muted-foreground">
              ログイン中:
            </div>
            <div className="text-sm font-medium">
              {user.email}
            </div>
            <button
              className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80"
              onClick={signOut}
            >
              サインアウト
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            サインイン
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">ダッシュボードを読み込み中...</div>
      ) : (
        <>
          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総豆数</CardTitle>
                <span className="text-muted-foreground" aria-hidden>☕</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBeans}</div>
                <p className="text-xs text-muted-foreground">現在: {activeBeans.length}件, 飲み終わった: {finishedBeans.length}件</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">現在の在庫</CardTitle>
                <span className="text-muted-foreground" aria-hidden>📈</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeTotalWeight}g</div>
                <p className="text-xs text-muted-foreground">現在飲んでいる豆の総重量</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均評価</CardTitle>
                <span className="text-muted-foreground" aria-hidden>⭐</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgLiking.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">好き度の平均</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>最近のテイスティング</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTastings.map(bean => (
                  <div key={bean.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{bean.name}</p>
                      <p className="text-sm text-muted-foreground">{bean.roast_level || ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end"><span>⭐</span><span className="font-medium">{bean.liking}</span></div>
                      <p className="text-xs text-muted-foreground">{bean.tasted_at && new Date(bean.tasted_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                ))}
                {recentTastings.length === 0 && (
                  <div className="text-sm text-muted-foreground">まだテイスティングがありません</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>高評価の豆トップ3</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topRated.map((bean, i) => (
                  <div key={bean.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-full font-medium">{i+1}</div>
                    <div className="flex-1">
                      <p className="font-medium">{bean.name}</p>
                      <p className="text-sm text-muted-foreground">{bean.origin_country || ''}</p>
                    </div>
                    <div className="flex items-center gap-1"><span>⭐</span><span className="font-medium">{bean.liking}</span></div>
                  </div>
                ))}
                {topRated.length === 0 && (
                  <div className="text-sm text-muted-foreground">評価データがありません</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

    </div>
  )
}