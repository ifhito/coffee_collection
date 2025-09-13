"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { beansAPI, shopsAPI, APIError } from "@/lib/api"
import type { BeanBatch, Shop } from "@/lib/types"
import { SelectBox } from "@/components/ui/selectbox"
import { TagInput } from "@/components/ui/tag-input"

const roastLevels = [
  { value: "light", label: "Light" },
  { value: "medium-light", label: "Medium Light" },
  { value: "medium", label: "Medium" },
  { value: "medium-dark", label: "Medium Dark" },
  { value: "dark", label: "Dark" },
]

export default function EditBeanPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined)
  const [bean, setBean] = useState<BeanBatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [shops, setShops] = useState<Shop[]>([])
  const [origins, setOrigins] = useState<string[]>([])
  const [flavorNotes, setFlavorNotes] = useState<string[]>([])

  const [form, setForm] = useState({
    name: "",
    origin_country: "",
    farm: "",
    variety: "",
    process: "",
    roast_level: "",
    roast_date: "",
    roaster_shop_id: "",
    purchase_shop_id: "",
    initial_weight_g: "",
    current_weight_g: "",
    notes: ""
  })

  useEffect(() => {
    if (!id) return
    Promise.all([loadBean(), loadShops()])
  }, [id])

  const loadBean = async () => {
    if (!id) return
    try {
      setLoading(true)
      const beanData = await beansAPI.getById(id)
      setBean(beanData)
      setOrigins(beanData.origins || [])
      setFlavorNotes(beanData.flavorNotes || [])

      // Populate form
      setForm({
        name: beanData.name || "",
        origin_country: beanData.origin_country || "",
        farm: beanData.farm || "",
        variety: beanData.variety || "",
        process: beanData.process || "",
        roast_level: beanData.roast_level || "",
        roast_date: beanData.roast_date || "",
        roaster_shop_id: beanData.roaster_shop_id || "",
        purchase_shop_id: beanData.purchase_shop_id || "",
        initial_weight_g: beanData.initial_weight_g?.toString() || "",
        current_weight_g: beanData.current_weight_g?.toString() || "",
        notes: beanData.notes || ""
      })
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

  const loadShops = async () => {
    try {
      const shopsData = await shopsAPI.getAll()
      setShops(shopsData || [])
    } catch (err) {
      console.error('店舗データの読み込みに失敗:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !bean) return

    setError("")
    setSaving(true)

    try {
      const updateData = {
        name: form.name.trim(),
        origin_country: form.origin_country.trim() || null,
        farm: form.farm.trim() || null,
        variety: form.variety.trim() || null,
        process: form.process.trim() || null,
        roast_level: form.roast_level || null,
        roast_date: form.roast_date || null,
        roaster_shop_id: form.roaster_shop_id || null,
        purchase_shop_id: form.purchase_shop_id || null,
        initial_weight_g: form.initial_weight_g ? parseInt(form.initial_weight_g) : null,
        current_weight_g: form.current_weight_g ? parseInt(form.current_weight_g) : null,
        notes: form.notes.trim() || null,
        origins: origins.length > 0 ? origins : null,
        flavorNotes: flavorNotes.length > 0 ? flavorNotes : null,
      }

      await beansAPI.update(id, updateData)
      router.push(`/beans/${id}`)
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('保存に失敗しました')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>
  if (!bean) return <div className="text-muted-foreground">データが見つかりませんでした。</div>

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">豆情報を編集</h1>
        <div className="text-sm text-muted-foreground">
          {bean.name}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            豆の名前 *
            <input
              type="text"
              required
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="豆の名前を入力"
            />
          </label>

          <label className="grid gap-1 text-sm">
            産地・国
            <input
              type="text"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.origin_country}
              onChange={(e) => setForm({ ...form, origin_country: e.target.value })}
              placeholder="エチオピア"
            />
          </label>
        </div>

        <div className="grid gap-1 text-sm">
          <label htmlFor="origins">詳細産地</label>
          <TagInput
            inputId="origins"
            value={origins}
            onChange={setOrigins}
            placeholder="イルガチェフェ / ゲデブ / コチェレ"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            農園
            <input
              type="text"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.farm}
              onChange={(e) => setForm({ ...form, farm: e.target.value })}
              placeholder="農園名"
            />
          </label>

          <label className="grid gap-1 text-sm">
            品種
            <input
              type="text"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.variety}
              onChange={(e) => setForm({ ...form, variety: e.target.value })}
              placeholder="ヘイルーム / ティピカ"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            精製方法
            <input
              type="text"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.process}
              onChange={(e) => setForm({ ...form, process: e.target.value })}
              placeholder="ナチュラル / ウォッシュド"
            />
          </label>

          <label className="grid gap-1 text-sm">
            焙煎度
            <SelectBox
              value={form.roast_level}
              onChange={(v) => setForm({ ...form, roast_level: v })}
              options={roastLevels}
              placeholder="選択してください"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            ロースター
            <SelectBox
              value={form.roaster_shop_id}
              onChange={(v) => setForm({ ...form, roaster_shop_id: v })}
              options={[
                { value: "", label: "選択なし" },
                ...shops.map(s => ({ value: s.id, label: s.name }))
              ]}
              placeholder="選択してください"
            />
          </label>

          <label className="grid gap-1 text-sm">
            購入店舗
            <SelectBox
              value={form.purchase_shop_id}
              onChange={(v) => setForm({ ...form, purchase_shop_id: v })}
              options={[
                { value: "", label: "選択なし" },
                ...shops.map(s => ({ value: s.id, label: s.name }))
              ]}
              placeholder="選択してください"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            焙煎日
            <input
              type="date"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.roast_date}
              onChange={(e) => setForm({ ...form, roast_date: e.target.value })}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            初期重量 (g)
            <input
              type="number"
              min="0"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.initial_weight_g}
              onChange={(e) => setForm({ ...form, initial_weight_g: e.target.value })}
              placeholder="200"
            />
          </label>

          <label className="grid gap-1 text-sm">
            現在重量 (g)
            <input
              type="number"
              min="0"
              className="rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
              value={form.current_weight_g}
              onChange={(e) => setForm({ ...form, current_weight_g: e.target.value })}
              placeholder="150"
            />
          </label>
        </div>

        <div className="grid gap-1 text-sm">
          <label htmlFor="flavor-notes">フレーバーノート</label>
          <TagInput
            inputId="flavor-notes"
            value={flavorNotes}
            onChange={setFlavorNotes}
            placeholder="チョコ / ナッツ / ベリー"
          />
        </div>

        <label className="grid gap-1 text-sm">
          メモ
          <textarea
            className="w-full min-h-24 rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="豆についてのメモや感想"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center h-12 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <Link
            href={`/beans/${id}`}
            className="inline-flex items-center justify-center h-12 px-4 rounded-md border hover:bg-accent hover:text-accent-foreground text-sm font-medium"
          >
            キャンセル
          </Link>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}
      </form>
    </div>
  )
}