import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabList, Tab, TabPanel } from './Tabs'

function Sample({ disabledThird = false, errorOnA = false } = {}) {
  return (
    <Tabs defaultValue="a">
      <TabList ariaLabel="Demo">
        <Tab value="a" hasError={errorOnA}>Tab A</Tab>
        <Tab value="b">Tab B</Tab>
        <Tab value="c" disabled={disabledThird}>Tab C</Tab>
      </TabList>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
      <TabPanel value="c">Panel C</TabPanel>
    </Tabs>
  )
}

describe('admin Tabs', () => {
  it('shows the tablist and only the active panel', () => {
    render(<Sample />)
    expect(screen.getByRole('tablist', { name: 'Demo' })).toBeInTheDocument()
    expect(screen.getByText('Panel A')).toBeVisible()
    expect(screen.getByText('Panel B')).not.toBeVisible()
  })

  it('switches the visible panel when a tab is clicked', async () => {
    render(<Sample />)
    await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }))
    expect(screen.getByText('Panel B')).toBeVisible()
    expect(screen.getByText('Panel A')).not.toBeVisible()
  })

  it('moves selection with the arrow keys', async () => {
    render(<Sample />)
    await userEvent.click(screen.getByRole('tab', { name: 'Tab A' }))
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByText('Panel B')).toBeVisible()
  })

  it('does not activate a disabled tab', async () => {
    render(<Sample disabledThird />)
    const tabC = screen.getByRole('tab', { name: 'Tab C' })
    expect(tabC).toBeDisabled()
    await userEvent.click(tabC)
    expect(screen.getByText('Panel C')).not.toBeVisible()
  })

  it('renders an error dot when hasError', () => {
    render(<Sample errorOnA />)
    expect(screen.getByRole('tab', { name: 'Tab A' }).querySelector('[data-error-dot]')).toBeInTheDocument()
  })
})
