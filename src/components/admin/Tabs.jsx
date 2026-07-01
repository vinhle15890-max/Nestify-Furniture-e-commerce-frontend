import * as RadixTabs from '@radix-ui/react-tabs'
import { createContext, useContext, useState, useCallback } from 'react'

// Internal context so TabPanel knows the active value without relying on
// Tailwind CSS data-variant classes (which don't apply in jsdom tests).
const TabsValueContext = createContext('')

// Reusable admin tab set built on Radix Tabs (roving-tabindex keyboard nav,
// aria wiring for free). Panels are force-mounted and merely hidden when
// inactive so a single form spanning multiple tabs keeps its state and
// validation across tab switches.
export function Tabs({ value: controlledValue, onValueChange, defaultValue, className, children }) {
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')

  const activeValue = isControlled ? controlledValue : internalValue

  const handleValueChange = useCallback(
    (v) => {
      if (!isControlled) setInternalValue(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange],
  )

  // Spread only the props Radix needs to avoid passing value={undefined}
  // which can confuse the controlled/uncontrolled distinction.
  const radixProps = isControlled ? { value: controlledValue } : { defaultValue }

  return (
    <TabsValueContext.Provider value={activeValue}>
      <RadixTabs.Root {...radixProps} onValueChange={handleValueChange} className={className}>
        {children}
      </RadixTabs.Root>
    </TabsValueContext.Provider>
  )
}

export function TabList({ ariaLabel, className, children }) {
  return (
    <RadixTabs.List
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-1 border-b border-border ${className ?? ''}`}
    >
      {children}
    </RadixTabs.List>
  )
}

export function Tab({ value, disabled = false, hasError = false, children }) {
  return (
    <RadixTabs.Trigger
      value={value}
      disabled={disabled}
      className="group relative -mb-px flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:text-foreground"
    >
      {children}
      {hasError && (
        <span data-error-dot aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-destructive" />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform group-data-[state=active]:scale-x-100"
      />
    </RadixTabs.Trigger>
  )
}

export function TabPanel({ value, className, children }) {
  const activeValue = useContext(TabsValueContext)
  const isActive = activeValue === value

  return (
    <RadixTabs.Content
      value={value}
      forceMount
      // Use inline style so visibility works in jsdom (no CSS engine).
      // In the browser, Tailwind's data-[state=inactive]:hidden also hides it.
      style={isActive ? undefined : { display: 'none' }}
      className={`pt-6 focus:outline-none data-[state=inactive]:hidden ${className ?? ''}`}
    >
      {children}
    </RadixTabs.Content>
  )
}
