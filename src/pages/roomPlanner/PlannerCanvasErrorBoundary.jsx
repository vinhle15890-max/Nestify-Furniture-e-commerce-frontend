import { Component } from 'react'
import { Box } from 'lucide-react'

export class PlannerCanvasErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Planner canvas failed to render', error, info)
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.sceneKey !== this.props.sceneKey) {
      this.setState({ error: null })
    }
  }

  retry = () => this.setState({ error: null })

  leaveRoomEdit = () => {
    this.props.onLeaveRoomEdit?.()
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-canvas px-8 text-center">
        <Box size={40} className="text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-lg font-medium text-foreground">Chưa thể hiển thị phòng lúc này</p>
          <p className="max-w-md text-sm text-muted-foreground">Thiết kế của bạn vẫn được giữ trong phiên này. Hãy thử mở lại khung phòng.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={this.retry} className="rounded-control border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Thử hiển thị lại
          </button>
          <button type="button" onClick={this.leaveRoomEdit} className="rounded-control px-4 py-2 text-sm text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Về chế độ sắp xếp
          </button>
        </div>
      </div>
    )
  }
}
