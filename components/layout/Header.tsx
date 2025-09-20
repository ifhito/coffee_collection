export function Header() {
  return (
    <header className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/50 shadow-sm">
      <div className="container mx-auto px-6 py-6">
        <div className="flex h-48 items-center gap-8">
          {/* Enhanced coffee icon */}
          <span style={{ fontSize: '3rem' }} role="img" aria-label="coffee">☕</span>

          {/* Enhanced title with gradient text */}
          <div className="flex flex-col">
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#92400e', letterSpacing: '-0.025em' }}>
              Coffee Collection
            </h1>
          </div>
        </div>
      </div>
    </header>
  )
}

