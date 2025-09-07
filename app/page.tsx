"use client"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function Page() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <div>
      <h1>ダッシュボード</h1>
      {!user ? (
        <form onSubmit={signIn} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <input placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input placeholder="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <button>Sign in</button>
        </form>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div>Signed in as: {user.email}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/beans">豆一覧</Link>
            <Link href="/brews/new">抽出を記録</Link>
            <Link href="/tastings/new">テイスティングを記録</Link>
            <Link href="/viz">可視化</Link>
          </div>
          <button onClick={signOut}>Sign out</button>
        </div>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>リソース</h2>
        <ul>
          <li>要件定義: docs/REQUIREMENTS.md</li>
          <li>設計: docs/DESIGN.md</li>
          <li>DB スキーマ: supabase/schema.sql</li>
        </ul>
      </section>
    </div>
  )
}
