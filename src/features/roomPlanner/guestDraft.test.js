import { beforeEach, describe, expect, it } from 'vitest'
import { clearLocalRoomDraft, editorStateToDraftSnapshot, readLocalRoomDraft, writeLocalRoomDraft } from './guestDraft'

describe('guest room recovery', () => {
  beforeEach(clearLocalRoomDraft)

  it('keeps a versioned scene snapshot with variant evidence for same-device recovery', () => {
    const scene = editorStateToDraftSnapshot({
      name: 'Phòng khách',
      description: '',
      room: { width: 4, depth: 5, height: 2.8, walls: { back: true, left: true, right: false } },
      items: [{
        variant: { id: 11, name: 'Vải be', model_3d_url: '/sofa.glb' },
        position: { x: 1, y: 0, z: 2 },
        rotation: { x: 0, y: 0.5, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }],
    })

    writeLocalRoomDraft(scene)

    expect(readLocalRoomDraft()).toMatchObject({
      name: 'Phòng khách',
      wall_right: false,
      items: [{ variant: { id: 11, name: 'Vải be' }, position: { x: 1, z: 2 } }],
    })
  })
})
