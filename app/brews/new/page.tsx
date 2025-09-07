"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { BeanBatch } from "@/lib/types"

export default function NewBrewPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [beans, setBeans] = useState<BeanBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ bean_batch_id: "", method: "ハンドドリップ", dose_g: "15", water_g: "240", temperature_c: "92", time_sec: "150" })
  const methods = ["ハンドドリップ", "エスプレッソ", "フレンチプレス", "エアロプレス", "サイフォン"]

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) load()
      setLoading(false)
    })
  }, [])

  async function load() {
    const { data, error } = await supabase.from('bean_batches').select('*').eq('archived', false).order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setBeans((data as BeanBatch[]) || [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!userId) return
    if (!form.bean_batch_id) { setError('豆を選択してください'); return }
    const dose = form.dose_g ? Number(form.dose_g) : null
    const brewRow = {
      user_id: userId,
      bean_batch_id: form.bean_batch_id,
      method: form.method,
      dose_g: dose,
      water_g: form.water_g ? Number(form.water_g) : null,
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      time_sec: form.time_sec ? Number(form.time_sec) : null,
    }
    const { data: inserted, error: e1 } = await supabase.from('brews').insert(brewRow).select('id, bean_batch_id, dose_g').single()
    if (e1) { setError(e1.message); return }

    // inventory log and bean current_weight update
    if (dose) {
      await supabase.from('inventory_logs').insert({ user_id: userId, bean_batch_id: inserted!.bean_batch_id, delta_g: -Math.round(dose), reason: 'brew' })
      // decrement current weight locally for UX; server value may differ
      const b = beans.find(b => b.id === inserted!.bean_batch_id)
      if (b?.current_weight_g != null) {
        await supabase.from('bean_batches').update({ current_weight_g: (b.current_weight_g || 0) - Math.round(dose) }).eq('id', b.id)
      }
    }
    setForm({ ...form, dose_g: "15", time_sec: "150" })
    alert('抽出を記録しました')
  }

  if (loading) return <p>読み込み中...</p>
  if (!userId) return <p><a href="/">サインイン</a>してください。</p>

  return (
    <div>
      <h1>抽出を記録</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <label>豆
          <select value={form.bean_batch_id} onChange={(e)=>setForm({ ...form, bean_batch_id: e.target.value })}>
            <option value="">選択してください</option>
            {beans.map(b => <option key={b.id} value={b.id}>{b.name} {b.roaster ? `(${b.roaster})` : ''}</option>)}
          </select>
        </label>
        <label>メソッド
          <select value={form.method} onChange={(e)=>setForm({ ...form, method: e.target.value })}>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>豆量[g]
          <input type="number" inputMode="decimal" value={form.dose_g} onChange={(e)=>setForm({ ...form, dose_g: e.target.value })} />
        </label>
        <label>湯量[g]
          <input type="number" inputMode="decimal" value={form.water_g} onChange={(e)=>setForm({ ...form, water_g: e.target.value })} />
        </label>
        <label>温度[℃]
          <input type="number" inputMode="decimal" value={form.temperature_c} onChange={(e)=>setForm({ ...form, temperature_c: e.target.value })} />
        </label>
        <label>抽出時間[秒]
          <input type="number" inputMode="numeric" value={form.time_sec} onChange={(e)=>setForm({ ...form, time_sec: e.target.value })} />
        </label>
        <button>保存</button>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </form>
    </div>
  )
}

