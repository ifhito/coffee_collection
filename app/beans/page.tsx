"use client"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { BeanBatch } from "@/lib/types"

export default function BeansPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [beans, setBeans] = useState<BeanBatch[]>([])
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: "",
    roaster: "",
    roast_level: "",
    initial_weight_g: "",
    roast_date: "",
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) loadBeans()
      setLoading(false)
    })
  }, [])

  async function loadBeans() {
    const { data, error } = await supabase
      .from("bean_batches")
      .select("*")
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(100)
    if (error) setError(error.message)
    else setBeans((data as BeanBatch[]) || [])
  }

  async function addBean(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!userId) return
    const name = form.name.trim()
    if (!name) { setError("名称は必須です"); return }
    const initial = form.initial_weight_g ? Number(form.initial_weight_g) : null
    const row = {
      user_id: userId,
      name,
      roaster: form.roaster?.trim() || null,
      roast_level: form.roast_level?.trim() || null,
      roast_date: form.roast_date || null,
      initial_weight_g: initial,
      current_weight_g: initial,
    }
    const { error } = await supabase.from("bean_batches").insert(row)
    if (error) setError(error.message)
    else { setForm({ name: "", roaster: "", roast_level: "", initial_weight_g: "", roast_date: "" }); loadBeans() }
  }

  async function archiveBean(id: string) {
    const { error } = await supabase.from("bean_batches").update({ archived: true }).eq("id", id)
    if (error) setError(error.message)
    else setBeans(beans.filter(b => b.id !== id))
  }

  async function adjustWeight(id: string, delta: number) {
    const bean = beans.find(b => b.id === id)
    if (!bean) return
    const next = (bean.current_weight_g ?? 0) + delta
    const { error } = await supabase.from("bean_batches").update({ current_weight_g: next }).eq("id", id)
    if (error) setError(error.message)
    else setBeans(beans.map(b => b.id === id ? { ...b, current_weight_g: next } : b))
  }

  if (loading) return <p>読み込み中...</p>
  if (!userId) return <p><a href="/">サインイン</a>してください。</p>

  return (
    <div>
      <h1>豆一覧</h1>
      <form onSubmit={addBean} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <input placeholder="名称（必須）" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
        <input placeholder="ロースター（任意）" value={form.roaster} onChange={(e)=>setForm({ ...form, roaster: e.target.value })} />
        <input placeholder="焙煎度（例: 浅/中/深）" value={form.roast_level} onChange={(e)=>setForm({ ...form, roast_level: e.target.value })} />
        <label>初期量[g]: <input type="number" inputMode="numeric" value={form.initial_weight_g} onChange={(e)=>setForm({ ...form, initial_weight_g: e.target.value })} /></label>
        <label>焙煎日: <input type="date" value={form.roast_date} onChange={(e)=>setForm({ ...form, roast_date: e.target.value })} /></label>
        <button>追加</button>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </form>

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10 }}>
        {beans.map(b => (
          <li key={b.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{b.roaster || ''} {b.roast_level ? `・${b.roast_level}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>在庫: {b.current_weight_g ?? 0} g</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button type="button" onClick={()=>adjustWeight(b.id, 10)}>+10</button>
                  <button type="button" onClick={()=>adjustWeight(b.id, -10)}>-10</button>
                  <button type="button" onClick={()=>archiveBean(b.id)} style={{ color: '#a00' }}>アーカイブ</button>
                </div>
              </div>
            </div>
          </li>
        ))}
        {beans.length === 0 && <li style={{ color: '#666' }}>まだ登録がありません。</li>}
      </ul>
    </div>
  )
}

