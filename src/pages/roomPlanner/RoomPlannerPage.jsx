import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RoomCanvas } from './scene/RoomCanvas'
import { RoomSetupDialog } from './RoomSetupDialog'
import { CatalogTray } from './CatalogTray'
import { PlannerToolbar } from './PlannerToolbar'
import { SelectedItemPanel } from './SelectedItemPanel'
import { SmallScreenNotice } from './SmallScreenNotice'
import { Spinner } from '../../components/Spinner'
import { useEditorStore } from '../../features/roomPlanner/editorStore'
import { useScene, useCreateScene, useUpdateScene } from '../../features/roomPlanner/hooks'
import { editorStateToPayload } from '../../features/roomPlanner/mappers'
import { useToastStore } from '../../store/toastStore'

const DEFAULT_ROOM = { width: 4, depth: 5, height: 2.8 }

export function RoomPlannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((state) => state.addToast)

  const sceneQuery = useScene(id)
  const createScene = useCreateScene()
  const updateScene = useUpdateScene()

  const store = useEditorStore()
  const [setupOpen, setSetupOpen] = useState(!id)

  // Fresh store whenever the route target changes.
  useEffect(() => {
    store.reset()
    setSetupOpen(!id)
    return () => store.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Hydrate an existing scene once it loads.
  useEffect(() => {
    if (id && sceneQuery.data?.data) {
      store.loadScene(sceneQuery.data.data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sceneQuery.data])

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const handler = (event) => {
      if (store.dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [store.dirty])

  const handleCreateRoom = (room) => {
    store.initNew(room)
    setSetupOpen(false)
  }

  const handleSave = async () => {
    const payload = editorStateToPayload(store)
    try {
      if (store.id) {
        await updateScene.mutateAsync({ id: store.id, payload })
      } else {
        const response = await createScene.mutateAsync(payload)
        store.markSaved(response.data.id)
        navigate(`/room-planner/${response.data.id}`, { replace: true })
      }
      addToast({ title: 'Đã lưu phòng.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Lưu phòng thất bại.', description: error?.message, variant: 'error' })
    }
  }

  const handleExit = () => {
    if (store.dirty && !window.confirm('Bạn có thay đổi chưa lưu. Thoát?')) return
    navigate('/')
  }

  const selectedItem = store.items.find((item) => item.localId === store.selectedId) ?? null

  if (id && sceneQuery.isLoading) {
    return <div className="flex h-dvh items-center justify-center"><Spinner label="Đang tải phòng" /></div>
  }
  if (id && sceneQuery.isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
        <p className="text-foreground">Không tìm thấy phòng thiết kế.</p>
        <button type="button" onClick={() => navigate('/')} className="text-accent hover:underline">Về cửa hàng</button>
      </div>
    )
  }

  return (
    <>
      <SmallScreenNotice />
      <div className="hidden h-dvh flex-col lg:flex">
        <PlannerToolbar
          name={store.name}
          onNameChange={store.setName}
          gizmoMode={store.gizmoMode}
          onGizmoModeChange={store.setGizmoMode}
          onSave={handleSave}
          saving={createScene.isPending || updateScene.isPending}
          dirty={store.dirty}
          onExit={handleExit}
        />
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden border-r border-border bg-surface-alt/40 p-4">
            <CatalogTray onAdd={store.addVariant} />
            <SelectedItemPanel item={selectedItem} onDelete={store.deleteSelected} onResetTransform={store.resetSelectedTransform} />
          </aside>
          <main className="relative min-w-0 flex-1 bg-surface">
            {store.status === 'ready' && <RoomCanvas />}
          </main>
        </div>
      </div>

      <RoomSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initialRoom={DEFAULT_ROOM}
        onSubmit={handleCreateRoom}
      />
    </>
  )
}
