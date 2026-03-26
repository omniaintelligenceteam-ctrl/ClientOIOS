export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0B1120', color: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
        <div className="min-h-screen flex flex-col" style={{ background: '#0B1120' }}>
          {/* Header */}
          <header
            className="w-full border-b flex items-center justify-center py-4 px-6"
            style={{ background: '#111827', borderColor: 'rgba(148,163,184,0.1)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ background: '#2DD4BF', color: '#0B1120' }}
              >
                O
              </div>
              <span className="font-semibold text-lg" style={{ color: '#F8FAFC' }}>
                OIOS
              </span>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 flex flex-col items-center justify-start px-4 py-8">
            <div className="w-full max-w-lg">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="w-full text-center py-4 text-xs" style={{ color: '#64748B' }}>
            Powered by OIOS
          </footer>
        </div>
      </body>
    </html>
  )
}
