import { describe, expect, it } from 'vitest'
import { describeModelFidelity } from './modelFidelity'

describe('describeModelFidelity', () => {
  it('never overstates appearance fidelity from a variant model URL', () => {
    expect(describeModelFidelity({ model_3d_url: 'model.glb', model_scale_confirmed: true, model_variant_fidelity_confirmed: false }).text).toMatch(/màu sắc và bề mặt hiển thị có thể khác đôi chút/i)
  })
})
