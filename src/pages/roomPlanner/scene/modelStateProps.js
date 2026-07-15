export const placeholderGroupProps = (state) => ({
  name: `model-fallback-${state.toLowerCase()}`,
  userData: { modelState: state },
})
