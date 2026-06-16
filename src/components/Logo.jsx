import logoUrl from '../public/assets/images/nestify-logo.svg'

export function Logo({ className = '' }) {
  return <img src={logoUrl} alt="Nestify" className={className} />
}
