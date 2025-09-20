"use client"
import { useEffect, useState } from "react"
import { beansAPI, shopsAPI, APIError } from "@/lib/api"
import type { BeanBatch, Shop } from "@/lib/types"
import Link from "next/link"
import { SelectBox } from "@/components/ui/selectbox"
import { ROAST_LEVELS, PROCESS_METHODS } from "@/lib/constants"
import { useRouter } from "next/navigation"

export default function AddBeanPage() {
  const router = useRouter()
  const [beans, setBeans] = useState<BeanBatch[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: "",
    roaster_shop_id: "",
    purchase_shop_id: "",
    roast_level: "",
    initial_weight_g: "",
    roast_date: "",
    origins: "",
    farm: "",
    variety: "",
    process: "",
    notes: "",
  })
  const [originsList, setOriginsList] = useState<string[]>([])
  const [mode, setMode] = useState({
    roaster: 'select' as 'select'|'new',
    purchase: 'select' as 'select'|'new',
    origins: 'select' as 'select'|'new',
  })
  const [newShop, setNewShop] = useState({
    name: "",
    type: "roaster" as "shop"|"roaster"|"online",
    url: "",
    address: "",
    memo: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [beansData, shopsData] = await Promise.all([
        beansAPI.getAll({ archived: false, limit: 100 }),
        shopsAPI.getAll()
      ])
      setBeans(beansData || [])
      setShops(shopsData || [])
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

  useEffect(() => {
    // keep origins string and list in sync (for manual editing or reset)
    const str = form.origins || ''
    const parsed = str.split(',').map(s=>s.trim()).filter(Boolean)
    setOriginsList(parsed)
  }, [])


  async function createShop() {
    if (!newShop.name.trim()) return null

    try {
      const shopData = {
        name: newShop.name.trim(),
        type: newShop.type || "roaster", // デフォルトでroasterに設定
        url: newShop.url.trim() || null,
        address: newShop.address.trim() || null,
        memo: newShop.memo.trim() || null,
      }

      console.log('Creating shop with data:', shopData) // デバッグログ

      const createdShop = await shopsAPI.create(shopData)

      console.log('Created shop:', createdShop) // デバッグログ

      // リストに追加
      setShops(prev => [...prev, createdShop])
      // フォームリセット
      setNewShop({ name: "", type: "roaster", url: "", address: "", memo: "" })
      return createdShop
    } catch (err) {
      console.error('Shop creation error:', err) // デバッグログ
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('ショップ作成に失敗しました')
      }
      return null
    }
  }

  async function addBean(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const name = form.name.trim()
    if (!name) { setError("名称は必須です"); return }

    try {
      const initial = form.initial_weight_g ? Number(form.initial_weight_g) : null
      const beanData = {
        name,
        roaster_shop_id: form.roaster_shop_id || null,
        purchase_shop_id: form.purchase_shop_id || null,
        roast_level: form.roast_level?.trim() || null,
        roast_date: form.roast_date || null,
        initial_weight_g: initial,
        farm: form.farm?.trim() || null,
        variety: form.variety?.trim() || null,
        process: form.process?.trim() || null,
        notes: form.notes?.trim() || null,
        origins: originsList.length > 0 ? originsList : null,
      }

      await beansAPI.create(beanData)
      router.push('/beans')
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('保存に失敗しました')
      }
    }
  }

  if (loading) return <p className="text-muted-foreground">読み込み中...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/beans"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md border hover:bg-accent hover:text-accent-foreground"
        >
          ←
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">豆を追加</h1>
      </div>

      <form onSubmit={addBean} className="grid gap-3 max-w-2xl">
        <input
          className="w-full h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          placeholder="名称（必須）"
          value={form.name}
          onChange={(e)=>setForm({ ...form, name: e.target.value })}
        />
        {/* Roaster shop select/new */}
        <div className="grid gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span>ロースター</span>
            <div className="flex gap-2" role="group" aria-label="ロースター 入力モード">
              <button type="button" aria-pressed={mode.roaster==='select'} className={"h-9 px-3 rounded-md border text-sm "+(mode.roaster==='select'?"bg-accent":"") } onClick={()=>setMode(m=>({...m, roaster:'select'}))}>選択</button>
              <button type="button" aria-pressed={mode.roaster==='new'} className={"h-9 px-3 rounded-md border text-sm "+(mode.roaster==='new'?"bg-accent":"") } onClick={()=>setMode(m=>({...m, roaster:'new'}))}>新規</button>
            </div>
          </div>
          {mode.roaster==='select' ? (
            <SelectBox
              value={form.roaster_shop_id}
              onChange={(v)=>setForm({ ...form, roaster_shop_id: v })}
              options={shops.filter(s => s.type === 'roaster').map(s => ({ value: s.id, label: s.name }))}
              placeholder="ロースターを選択してください"
            />
          ) : (
            <div className="space-y-2 p-3 border rounded-md">
              <div className="font-medium">新しいロースターを追加</div>
              <div className="grid gap-2">
                <input
                  className="h-10 rounded-md border bg-background px-3 outline-none"
                  placeholder="ロースター名（必須）"
                  value={newShop.name}
                  onChange={(e)=>setNewShop({...newShop, name: e.target.value})}
                />
                <input
                  className="h-10 rounded-md border bg-background px-3 outline-none"
                  placeholder="URL（任意）"
                  value={newShop.url}
                  onChange={(e)=>setNewShop({...newShop, url: e.target.value})}
                />
                <button
                  type="button"
                  className="h-10 px-3 rounded-md bg-secondary text-sm hover:bg-secondary/80"
                  onClick={async () => {
                    // ロースターの場合は強制的にtype: "roaster"に設定
                    const originalType = newShop.type
                    setNewShop(prev => ({ ...prev, type: "roaster" }))

                    const shop = await createShop()
                    if (shop) {
                      setForm({...form, roaster_shop_id: shop.id})
                      setMode(m => ({...m, roaster: 'select'}))
                    } else {
                      // 失敗時は元のtypeに戻す
                      setNewShop(prev => ({ ...prev, type: originalType }))
                    }
                  }}
                >
                  ロースターを追加して選択
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Purchase shop select/new */}
        <div className="grid gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span>購入店舗（任意）</span>
            <div className="flex gap-2" role="group" aria-label="購入店舗 入力モード">
              <button type="button" aria-pressed={mode.purchase==='select'} className={"h-9 px-3 rounded-md border text-sm "+(mode.purchase==='select'?"bg-accent":"") } onClick={()=>setMode(m=>({...m, purchase:'select'}))}>選択</button>
              <button type="button" aria-pressed={mode.purchase==='new'} className={"h-9 px-3 rounded-md border text-sm "+(mode.purchase==='new'?"bg-accent":"") } onClick={()=>setMode(m=>({...m, purchase:'new'}))}>新規</button>
            </div>
          </div>
          {mode.purchase==='select' ? (
            <SelectBox
              value={form.purchase_shop_id}
              onChange={(v)=>setForm({ ...form, purchase_shop_id: v })}
              options={[
                { value: "", label: "選択しない" },
                ...shops.map(s => ({ value: s.id, label: `${s.name} (${s.type})` }))
              ]}
              placeholder="購入店舗を選択してください"
            />
          ) : (
            <div className="space-y-2 p-3 border rounded-md">
              <div className="font-medium">新しい店舗を追加</div>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="h-10 rounded-md border bg-background px-3 outline-none"
                    placeholder="店舗名（必須）"
                    value={newShop.name}
                    onChange={(e)=>setNewShop({...newShop, name: e.target.value})}
                  />
                  <SelectBox
                    value={newShop.type}
                    onChange={(v)=>setNewShop({...newShop, type: v as any})}
                    options={[
                      { value: "shop", label: "店舗" },
                      { value: "roaster", label: "ロースター" },
                      { value: "online", label: "オンライン" }
                    ]}
                    placeholder="種類"
                  />
                </div>
                <input
                  className="h-10 rounded-md border bg-background px-3 outline-none"
                  placeholder="住所（任意）"
                  value={newShop.address}
                  onChange={(e)=>setNewShop({...newShop, address: e.target.value})}
                />
                <button
                  type="button"
                  className="h-10 px-3 rounded-md bg-secondary text-sm hover:bg-secondary/80"
                  onClick={async () => {
                    const shop = await createShop()
                    if (shop) {
                      setForm({...form, purchase_shop_id: shop.id})
                      setMode(m => ({...m, purchase: 'select'}))
                    }
                  }}
                >
                  店舗を追加して選択
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Roast level - 固定値から選択 */}
        <div className="grid gap-1 text-sm">
          <span>焙煎度</span>
          <SelectBox
            value={form.roast_level}
            onChange={(v)=>setForm({ ...form, roast_level: v })}
            options={[...ROAST_LEVELS]}
            placeholder="選択してください"
          />
        </div>
        {/* Origins select/new with multi-add chips */}
        <div className="grid gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span>産地（複数可）</span>
            <div className="flex gap-2" role="group" aria-label="産地 入力モード">
              <button type="button" aria-pressed={mode.origins==='select'} className={"h-9 px-3 rounded-md border text-sm "+(mode.origins==='select'?"bg-accent":"")} onClick={()=>setMode(m=>({...m, origins:'select'}))}>選択</button>
              <button type="button" aria-pressed={mode.origins==='new'} className={"h-9 px-3 rounded-md border text-sm "+(mode.origins==='new'?"bg-accent":"")} onClick={()=>setMode(m=>({...m, origins:'new'}))}>新規</button>
            </div>
          </div>
          {mode.origins==='select' ? (
            <SelectBox
              value={""}
              onChange={(v)=>{ if (v) setOriginsList(list => Array.from(new Set([...list, v])))} }
              options={Array.from(new Set([
                ...beans.map(b=>b.origin_country).filter(Boolean) as string[],
              ])).sort()}
              placeholder="既存から追加"
              className="max-w-xs"
            />
          ) : (
            <div className="flex gap-2 items-center">
              <input className="flex-1 rounded-md border bg-background px-3 h-10 outline-none" placeholder="新規産地を入力して追加" onKeyDown={(e)=>{
                if (e.key==='Enter') { e.preventDefault(); const v=(e.target as HTMLInputElement).value.trim(); if (v) { setOriginsList(list=> Array.from(new Set([...list, v]))); (e.target as HTMLInputElement).value='' } }
              }} />
              <button type="button" className="px-3 h-10 rounded-md border" onClick={()=>{
                const el = (document.activeElement as HTMLInputElement)
                const v = el && 'value' in el ? (el as HTMLInputElement).value.trim() : ''
                if (v) { setOriginsList(list=> Array.from(new Set([...list, v]))); (el as HTMLInputElement).value='' }
              }}>追加</button>
            </div>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {originsList.map(v => (
              <span key={v} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                {v}
                <button type="button" className="text-muted-foreground" onClick={()=> setOriginsList(list => list.filter(x=>x!==v))}>×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Farm - 入力のみ */}
          <div className="grid gap-1 text-sm">
            <span>農園</span>
            <input className="rounded-md border bg-background px-3 h-10 outline-none" placeholder="農園" value={form.farm} onChange={(e)=>setForm({ ...form, farm: e.target.value })} />
          </div>
          {/* Variety - 入力のみ */}
          <div className="grid gap-1 text-sm">
            <span>種類（品種）</span>
            <input className="rounded-md border bg-background px-3 h-10 outline-none" placeholder="品種" value={form.variety} onChange={(e)=>setForm({ ...form, variety: e.target.value })} />
          </div>
          {/* Process - 固定値から選択 */}
          <div className="grid gap-1 text-sm">
            <span>精製方法</span>
            <SelectBox
              value={form.process}
              onChange={(v)=>setForm({...form, process:v})}
              options={[...PROCESS_METHODS]}
              placeholder="選択してください"
            />
          </div>
        </div>
        <label className="grid gap-1 text-sm">
          初期量[g]
          <input
            type="number"
            inputMode="numeric"
            className="w-full h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={form.initial_weight_g}
            onChange={(e)=>setForm({ ...form, initial_weight_g: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          焙煎日
          <input
            type="date"
            className="w-full h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={form.roast_date}
            onChange={(e)=>setForm({ ...form, roast_date: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          一言（メモ）
          <input
            className="w-full h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={form.notes}
            placeholder="メモ"
            onChange={(e)=>setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <button className="w-fit inline-flex items-center justify-center h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">追加</button>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </form>
    </div>
  )
}