import { expect, it } from 'vitest'
import { applyProps } from '@react-three/fiber'
import { Group } from 'three'
import { MODEL_STATE } from './FurnitureModel'
import { placeholderGroupProps } from './modelStateProps'

it('applies the actual placeholder group props through Fiber without a dashed path crash', () => {
  const group = new Group()
  expect(() => applyProps(group, placeholderGroupProps(MODEL_STATE.LOADING))).not.toThrow()
  expect(group.userData).toEqual({ modelState: MODEL_STATE.LOADING })
})

it('proves the removed dashed prop reproduces the original Fiber failure', () => {
  expect(() => applyProps(new Group(), { 'data-model-state': MODEL_STATE.LOADING }))
    .toThrow("Cannot read properties of undefined (reading 'model')")
})
