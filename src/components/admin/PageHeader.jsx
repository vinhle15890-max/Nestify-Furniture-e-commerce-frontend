// Consistent page top for every admin screen: optional eyebrow, an icon + title, a
// description, and a right-aligned actions slot (buttons). Keeps spacing uniform.
export function PageHeader({ eyebrow, title, description, icon: Icon, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 flex items-center gap-2.5 font-display text-2xl text-foreground">
          {Icon && <Icon size={22} className="text-accent" aria-hidden="true" />}
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
