import { useReveal } from '../lib/useReveal'

/**
 * Wraps children in a fade-up reveal that triggers when scrolled into view.
 * `delay` (ms) staggers sequential items. `as` swaps the wrapper element.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...props }) {
  const [ref, visible] = useReveal()

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </Tag>
  )
}
