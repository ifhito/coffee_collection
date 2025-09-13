"use client"
import { useEffect, useState } from "react"
import { beansAPI, authAPI, APIError } from "@/lib/api"
import type { BeanBatch } from "@/lib/types"
import Link from "next/link"

export default function ManageBeansPage() {
  const [activeBeans, setActiveBeans] = useState<BeanBatch[]>([])
  const [finishedBeans, setFinishedBeans] = useState<BeanBatch[]>([])
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  useEffect(() => {
    checkAuthStatus()
    loadBeans()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const { user } = await authAPI.getUser()
      setIsLoggedIn(!!user)
    } catch (err) {
      setIsLoggedIn(false)
    }
  }

  async function loadBeans() {
    try {
      setLoading(true)
      const [activeBeans, finishedBeans] = await Promise.all([
        beansAPI.getAll({ archived: false, limit: 100 }),
        beansAPI.getAll({ archived: true, limit: 100 })
      ])

      setActiveBeans(activeBeans || [])
      setFinishedBeans(finishedBeans || [])
    } catch (err) {
      // 認証エラーの場合でもデータを表示するため、エラーをログに記録するだけ
      console.error('豆データの読み込みエラー:', err)
      if (err instanceof APIError && err.status !== 401) {
        setError(err.message)
      } else if (!(err instanceof APIError)) {
        setError('データの読み込み中にエラーが発生しました')
      }
      // 401エラー（認証エラー）の場合はエラーメッセージを表示しない
    } finally {
      setLoading(false)
    }
  }

  function startFinishFlow(id: string) {
    // 飲み終わりフローでテイスティング画面に遷移
    window.location.href = `/tastings/new?bean=${id}&finish=true`
  }

  async function restoreBean(id: string) {
    try {
      await beansAPI.update(id, { archived: false })
      const bean = finishedBeans.find(b => b.id === id)
      if (bean) {
        setFinishedBeans(finishedBeans.filter(b => b.id !== id))
        setActiveBeans([{ ...bean, archived: false }, ...activeBeans])
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('更新に失敗しました')
      }
    }
  }


  async function deleteBean(id: string) {
    const bean = [...activeBeans, ...finishedBeans].find(b => b.id === id)
    if (!bean) return
    if (!confirm(`「${bean.name}」を完全に削除しますか？この操作は取り消せません。`)) return

    try {
      await beansAPI.delete(id)
      // UIから削除
      setActiveBeans(activeBeans.filter(b => b.id !== id))
      setFinishedBeans(finishedBeans.filter(b => b.id !== id))
    } catch (err) {
      if (err instanceof APIError) {
        setError(`削除に失敗しました: ${err.message}`)
      } else {
        setError('削除に失敗しました')
      }
    }
  }

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>

  const BeansManageList = ({ beans, title, emptyMessage, isActive }: {
    beans: BeanBatch[],
    title: string,
    emptyMessage: string,
    isActive: boolean
  }) => (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{title} ({beans.length}件)</h2>
      <ul className="grid gap-2">
        {beans.map(b => (
          <li key={b.id} className="relative rounded-lg border p-3 overflow-hidden">
            <Link href={`/beans/${b.id}`} aria-label={`${b.name}の詳細`} className="absolute inset-0 rounded-lg block z-10" />
            <div className="relative z-0">
              <div className="font-medium mb-2">{b.name}</div>
              <div className="text-xs text-muted-foreground mb-1">
                {[b.roast_level].filter(Boolean).join(' ・ ')}
              </div>
              {!isActive && (
                <div className="text-xs text-orange-600 font-medium mb-2">
                  飲み終わった
                </div>
              )}
              <div className="flex items-end justify-between">
                <div className="text-sm text-muted-foreground">
                  在庫: {b.current_weight_g ?? 0} g
                </div>
                <div className="flex gap-2 items-center relative z-20">
                  {isLoggedIn && (
                    <>
                      {/* Edit button */}
                      <Link
                        href={`/beans/${b.id}/edit`}
                        title="編集"
                        aria-label="編集"
                        className="inline-flex items-center justify-center h-11 w-11 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-accent-foreground outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-colors"
                      >
                        <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" className="transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </Link>
                      {/* Finish/Restore button */}
                      <button
                        onClick={(e)=>{ e.preventDefault(); isActive ? startFinishFlow(b.id) : restoreBean(b.id) }}
                        title={isActive ? "飲み終わった" : "復元"}
                        aria-label={isActive ? "飲み終わった" : "復元"}
                        className="inline-flex items-center justify-center h-11 w-11 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-accent-foreground outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-colors"
                      >
                        {isActive ? (
                          <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" className="transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7h18v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <path d="M3 7l3-3h12l3 3"/>
                            <path d="M10 12h4"/>
                          </svg>
                        ) : (
                          <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" className="transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7h18v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <path d="M3 7l3-3h12l3 3"/>
                            <path d="M14 12l-4 0"/>
                            <path d="M12 10l0 4"/>
                          </svg>
                        )}
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e)=>{ e.preventDefault(); deleteBean(b.id) }}
                        title="削除"
                        aria-label="削除"
                        className="inline-flex items-center justify-center h-11 w-11 rounded-full text-destructive hover:bg-destructive/10 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-colors"
                      >
                        <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" className="transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
        {beans.length === 0 && <li className="text-muted-foreground">{emptyMessage}</li>}
      </ul>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">豆一覧</h1>
        {isLoggedIn && (
          <Link
            href="/beans/add"
            className="inline-flex items-center justify-center h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            豆を追加
          </Link>
        )}
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <BeansManageList
        beans={activeBeans}
        title="現在飲んでいる豆"
        emptyMessage="まだ豆が登録されていません。"
        isActive={true}
      />

      <BeansManageList
        beans={finishedBeans}
        title="飲み終わった豆"
        emptyMessage="飲み終わった豆はありません。"
        isActive={false}
      />
    </div>
  )
}