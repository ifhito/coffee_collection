"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Brew } from "@/lib/types"

const scoreOptions = [1,2,3,4,5]

export default function NewTastingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [brews, setBrews] = useState<Brew[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ brew_id: "", liking: 4, aroma: 4, sourness: 3, bitterness: 2, flavor_notes: "", comment: "" })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) load()
      setLoading(false)
    })
  }, [])

  async function load() {
    const { data, error } = await supabase.from('brews').select('*').order('date', { ascending: false }).limit(50)
    if (error) setError(error.message)
    else setBrews((data as Brew[]) || [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!userId) return
    if (!form.brew_id) { setError('抽出を選択してください'); return }
    const row = {
      user_id: userId,
      brew_id: form.brew_id,
      liking: Number(form.liking),
      aroma: Number(form.aroma),
      sourness: Number(form.sourness),
      bitterness: Number(form.bitterness),
      flavor_notes: form.flavor_notes ? form.flavor_notes.split(',').map(s => s.trim()).filter(Boolean) : [],
      comment: form.comment || null,
    }
    const { error } = await supabase.from('tastings').insert(row)
    if (error) setError(error.message)
    else { setForm({ brew_id: "", liking: 4, aroma: 4, sourness: 3, bitterness: 2, flavor_notes: "", comment: "" }); alert('テイスティングを記録しました') }
  }

  if (loading) return <p>読み込み中...</p>
  if (!userId) return <p><a href="/">サインイン</a>してください。</p>

  return (
    <div>
      <h1>テイスティングを記録</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <label>抽出
          <select value={form.brew_id} onChange={(e)=>setForm({ ...form, brew_id: e.target.value })}>
            <option value="">選択してください</option>
            {brews.map(b => <option key={b.id} value={b.id}>{new Date(b.date).toLocaleString()}・{b.method}</option>)}
          </select>
        </label>
        <label>好き度
          <select value={form.liking} onChange={(e)=>setForm({ ...form, liking: Number(e.target.value) })}>
            {scoreOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>香り
          <select value={form.aroma} onChange={(e)=>setForm({ ...form, aroma: Number(e.target.value) })}>
            {scoreOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>酸っぱさ
          <select value={form.sourness} onChange={(e)=>setForm({ ...form, sourness: Number(e.target.value) })}>
            {scoreOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>苦さ
          <select value={form.bitterness} onChange={(e)=>setForm({ ...form, bitterness: Number(e.target.value) })}>
            {scoreOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>フレーバーノート（カンマ区切り）
          <input value={form.flavor_notes} placeholder="チョコ, ナッツ, ベリー" onChange={(e)=>setForm({ ...form, flavor_notes: e.target.value })} />
        </label>
        <label>コメント
          <textarea value={form.comment} rows={3} onChange={(e)=>setForm({ ...form, comment: e.target.value })} />
        </label>
        <button>保存</button>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </form>
    </div>
  )
}

