import { useLayoutEffect, useRef, useState } from 'react'

export function TruncatedText({ as: Tag = 'span', text, className, wrapClassName }: { as?: 'h1' | 'span'; text: string; className: string; wrapClassName?: string }) {
  const heading = useRef<HTMLElement>(null)
  const hint = useRef<HTMLDivElement>(null)
  const [truncated, setTruncated] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useLayoutEffect(() => {
    const element = heading.current!
    let active = true
    const measure = () => {
      if (!active) return
      setTruncated(element.scrollWidth > element.clientWidth)
      element.parentElement!.style.setProperty('--title-hint-space', `${Math.max(0, window.innerHeight - element.getBoundingClientRect().bottom - 8)}px`)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    window.addEventListener('resize', measure)
    document.addEventListener('scroll', measure, true)
    document.fonts?.addEventListener('loadingdone', measure)
    void document.fonts?.ready.then(measure)
    return () => {
      active = false
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      document.removeEventListener('scroll', measure, true)
      document.fonts?.removeEventListener('loadingdone', measure)
    }
  }, [text])
  return <div className={`page-title-wrap${wrapClassName ? ` ${wrapClassName}` : ''}`} data-hint-dismissed={dismissed || undefined} onMouseEnter={() => setDismissed(false)} onFocus={() => setDismissed(false)}>
    <Tag ref={heading as never} className={className} tabIndex={truncated ? 0 : undefined} onKeyDown={event => {
      if (event.key === 'Escape') { setDismissed(true); return }
      const surface = hint.current
      if (!surface || surface.scrollHeight <= surface.clientHeight) return
      const offsets: Record<string, number> = { ArrowDown: 40, ArrowUp: -40, PageDown: surface.clientHeight, PageUp: -surface.clientHeight, Home: -surface.scrollHeight, End: surface.scrollHeight }
      const offset = offsets[event.key]
      if (offset === undefined) return
      event.preventDefault()
      surface.scrollTop += offset
    }}>{text}</Tag>
    {truncated ? <div ref={hint} className="page-title-hint" aria-hidden="true" tabIndex={-1}>{text}</div> : null}
  </div>
}
