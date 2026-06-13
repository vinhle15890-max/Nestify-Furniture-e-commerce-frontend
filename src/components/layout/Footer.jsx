export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Nestify. Mọi quyền được bảo lưu.</p>
      </div>
    </footer>
  )
}
