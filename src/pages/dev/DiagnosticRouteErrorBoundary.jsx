import { Component, Fragment } from 'react'

const redactUrls = (value) => String(value ?? '').replace(/https?:\/\/\S+/g, '[URL_REDACTED]')

export class DiagnosticRouteErrorBoundary extends Component {
  state = { error: null, attempt: 0 }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('R2 diagnostic route crashed', {
      name: error?.name,
      message: redactUrls(error?.message),
      stack: redactUrls(error?.stack),
      componentStack: redactUrls(info.componentStack),
    })
  }

  retry = () => this.setState(({ attempt }) => ({ error: null, attempt: attempt + 1 }))

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
          <section role="alert" className="max-w-lg border border-border bg-surface p-5">
            <h1 className="font-medium">Diagnostic 3D gặp lỗi</h1>
            <p className="mt-2 font-mono text-sm">{redactUrls(this.state.error.message)}</p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={this.retry} className="rounded-control border border-border px-3 py-2 text-sm">Thử lại</button>
              <button type="button" onClick={() => window.location.reload()} className="rounded-control border border-border px-3 py-2 text-sm">Tải lại trang</button>
            </div>
          </section>
        </main>
      )
    }

    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>
  }
}
