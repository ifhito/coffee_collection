export const metadata = {
  title: 'Coffee Collection',
  description: 'Personal coffee bean manager'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', margin: 0 }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ textDecoration: 'none', color: '#111', fontWeight: 700 }}>Coffee Collection</a>
            <nav style={{ display: 'flex', gap: 12, fontSize: 14 }}>
              <a href="/beans" style={{ textDecoration: 'none' }}>Beans</a>
              <a href="/brews/new" style={{ textDecoration: 'none' }}>Add Brew</a>
              <a href="/tastings/new" style={{ textDecoration: 'none' }}>Add Tasting</a>
              <a href="/viz" style={{ textDecoration: 'none' }}>Viz</a>
            </nav>
          </div>
        </header>
        <main style={{ padding: 16 }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>{children}</div>
        </main>
      </body>
    </html>
  )
}
