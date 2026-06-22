import { useState } from 'react'
import { Reveal } from '../Reveal'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-32 lg:px-10">
        <Reveal>
          <p className="eyebrow">Bản tin</p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.4vw,3rem)] leading-tight text-foreground">
            Tham gia Nestify Journal
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Cảm hứng thiết kế, bộ sưu tập mới và ưu đãi dành riêng — gửi đến hộp thư của bạn.
          </p>

          {submitted ? (
            <p role="status" className="mt-10 text-lg text-secondary">
              Cảm ơn bạn đã đăng ký nhận bản tin Nestify.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                Địa chỉ email
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@cuaban.com"
                className="flex-1 rounded-control border border-border-strong bg-surface px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-control bg-primary px-8 py-4 text-sm font-medium tracking-wide text-surface transition-colors duration-200 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt"
              >
                Đăng ký
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
