/** Reference sizes of the "Supported viewports" requirement in openspec/specs/application-shell/spec.md. */
export const viewports = {
  phoneNarrow: { width: 320, height: 568 },
  phone: { width: 390, height: 844 },
  phoneLandscape: { width: 568, height: 320 },
  tablet: { width: 820, height: 1180 },
  laptop: { width: 1280, height: 800 },
  wide: { width: 1440, height: 900 },
} as const

export const referenceViewports = Object.values(viewports)

/** The reference size of a reference width. */
export function viewportFor(width: number) {
  const size = referenceViewports.find(size => size.width === width)
  if (!size) throw new Error(`${width}px is not a reference width`)
  return size
}
