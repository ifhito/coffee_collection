export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center gap-3">
          {/* simple inline coffee icon */}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-6 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8h13a4 4 0 0 1 0 8H7a4 4 0 0 1-4-4V8z" />
            <path d="M16 8h3a3 3 0 0 1 0 6h-3" />
            <path d="M5 22h10" />
            <path d="M9 2v2" />
            <path d="M13 2v2" />
          </svg>
          <h1 className="text-xl font-medium tracking-tight">コーヒー豆管理</h1>
        </div>
      </div>
    </header>
  )
}

