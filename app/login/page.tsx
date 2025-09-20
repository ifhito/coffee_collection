"use client"
import { useState } from "react"
import { authAPI, APIError } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("testuser12345@gmail.com")
  const [password, setPassword] = useState("test123456")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)


  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await authAPI.login(email, password)
      console.log('Login successful:', result)

      // ログイン成功後、トークンが設定されていることを確認してからリダイレクト
      setTimeout(() => {
        console.log('Redirecting to dashboard...')
        window.location.href = '/' // router.push()の代わりにhardリロード
      }, 200)
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('ログインに失敗しました')
      }
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md border hover:bg-accent hover:text-accent-foreground"
        >
          ←
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">サインイン</h1>
      </div>

      <form onSubmit={signIn} className="grid gap-3 max-w-md">
        <div className="grid gap-1">
          <label className="text-sm font-medium">メールアドレス</label>
          <input
            type="email"
            className="w-full h-11 rounded-md border bg-background px-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">パスワード</label>
          <input
            type="password"
            className="w-full h-11 rounded-md border bg-background px-3 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "サインイン中..." : "サインイン"}
        </button>

        {error && <div className="text-sm text-destructive">{error}</div>}
      </form>

      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">アカウントをお持ちでない場合:</p>
        <p>
          新規アカウントの作成は、Supabaseの管理画面から行ってください。<br/>
          一般ユーザーによるアカウント登録は無効化されています。
        </p>
        <p className="text-xs">
          管理者にお問い合わせいただくか、Supabase Auth の Users から直接ユーザーを作成してください。
        </p>
      </div>
    </div>
  )
}
