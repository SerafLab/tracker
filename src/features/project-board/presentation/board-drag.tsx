import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react'
import { Accessibility, AutoScroller, PointerActivationConstraints, PointerSensor, type DragDropManager } from '@dnd-kit/dom'
import { pointerIntersection } from '@dnd-kit/collision'
import { useTranslation } from 'react-i18next'
import type { Card, CardPlacement, Id, ProjectBoard } from '../domain/model'
import { appendPlacement, cardPriority, sameCardGroup } from '../domain/order'
import type { MoveCardStateResult } from '../state/project-board-store'

export type PlacementPreview = { card: Card; placement: CardPlacement }
type Interaction = { disabled: boolean; active: Id | null; suppression: RefObject<Id | null>; resetPointer(): void }
const InteractionContext = createContext<Interaction | null>(null)
const PreviewContext = createContext<PlacementPreview | null>(null)
const sensors = [PointerSensor.configure({
  activationConstraints: event => event.pointerType === 'touch' ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })] : [new PointerActivationConstraints.Distance({ value: 5 })],
  preventActivation: event => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return true
    if (!(event.target instanceof Element)) return false
    if (event.target.closest('button,input,select,textarea,[contenteditable="true"],[role="menu"],[role="menuitem"],.menu')) return true
    const link = event.target.closest('a')
    return !!link && !link.matches('.card-detail-link')
  },
})]
const plugins: ComponentProps<typeof DragDropProvider>['plugins'] = defaults => [...defaults.filter(plugin => plugin !== Accessibility && plugin !== AutoScroller), AutoScroller.configure({ acceleration: 15, threshold: { x: .18, y: .18 } })]

export function BoardDrag({ board, disabled, onPlace, children }: { board: ProjectBoard; disabled: boolean; onPlace(id: Id, placement: CardPlacement): Promise<MoveCardStateResult>; children: ReactNode }) {
  const { t } = useTranslation()
  const surface = useRef<HTMLDivElement>(null)
  const suppression = useRef<Id | null>(null)
  const source = useRef<Card | null>(null)
  const startedBoard = useRef<ProjectBoard | null>(null)
  const manager = useRef<DragDropManager | null>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const [active, setActive] = useState<Card | null>(null)
  const [preview, setPreview] = useState<PlacementPreview | null>(null)
  const boardRef = useRef(board); boardRef.current = board
  const project = (point: { x: number; y: number }): PlacementPreview | null => {
    const card = source.current
    const scroller = surface.current?.querySelector<HTMLElement>('.status-columns')
    if (!card || !scroller) return null
    const bounds = scroller.getBoundingClientRect()
    if (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) return null
    const column = Array.from(scroller.querySelectorAll<HTMLElement>('[data-status-id]')).find(element => { const box = element.getBoundingClientRect(); return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom })
    const status = boardRef.current.statuses.find(item => item.id === column?.dataset.statusId)
    if (!column || !status) return null
    const peers = status.cards.filter(item => item.id !== card.id && sameCardGroup(item, card))
    const before = peers.find(peer => {
      const element = Array.from(column.querySelectorAll<HTMLElement>('[data-card-id]')).find(item => item.dataset.cardId === peer.id)
      if (!element) return false
      const box = element.getBoundingClientRect()
      return point.y < box.top + box.height / 2
    })
    return { card, placement: { ...appendPlacement(card, status.id), beforeCardId: before?.id ?? null } }
  }
  const projectRef = useRef(project); projectRef.current = project
  const updatePreview = (point: { x: number; y: number }) => {
    lastPoint.current = point
    const next = projectRef.current(point)
    setPreview(previous => previous?.placement.statusId === next?.placement.statusId && previous?.placement.beforeCardId === next?.placement.beforeCardId ? previous : next)
  }
  useEffect(() => {
    if (source.current && (disabled || startedBoard.current !== board)) manager.current?.actions.stop({ canceled: true })
  }, [board, disabled])
  useEffect(() => {
    if (!active) return
    const scroll = () => { if (source.current && lastPoint.current) updatePreview(lastPoint.current) }
    document.addEventListener('scroll', scroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', scroll, true)
  }, [active])
  useEffect(() => () => { manager.current?.actions.stop({ canceled: true }) }, [])
  const interaction = useMemo<Interaction>(() => ({ disabled, active: active?.id ?? null, suppression, resetPointer: () => { if (!source.current) suppression.current = null } }), [disabled, active?.id])
  return <InteractionContext.Provider value={interaction}><PreviewContext.Provider value={preview}>
    <DragDropProvider sensors={sensors} plugins={plugins}
      onBeforeDragStart={event => { if (disabled) event.preventDefault() }}
      onDragStart={(event, instance) => {
        const card = board.statuses.flatMap(status => status.cards).find(item => item.id === event.operation.source?.id)
        if (!card) { instance.actions.stop({ canceled: true }); return }
        source.current = card; startedBoard.current = board; manager.current = instance
        suppression.current = card.id; setActive(card)
        updatePreview(event.operation.position.current)
      }}
      onDragMove={event => { if (source.current) updatePreview(event.operation.position.current) }}
      onDragOver={event => { if (source.current) updatePreview(event.operation.position.current) }}
      onDragEnd={event => {
        const destination = !event.canceled && source.current && startedBoard.current === boardRef.current ? projectRef.current(event.operation.position.current) : null
        source.current = null; startedBoard.current = null; lastPoint.current = null
        setActive(null); setPreview(null)
        if (destination) void onPlace(destination.card.id, destination.placement)
      }}>
      <div ref={surface} className="board-drag-surface" data-drag-active={!!active}>{children}</div>
      <DragOverlay dropAnimation={null}><div className="drag-card-preview surface-card" inert aria-hidden="true"><strong>{active?.name}</strong>{active?.important ? <span>{t('important')}</span> : null}{active?.urgent ? <span>{t('urgent')}</span> : null}</div></DragOverlay>
    </DragDropProvider>
  </PreviewContext.Provider></InteractionContext.Provider>
}

export function useCardDrag(card: Card) {
  const context = useContext(InteractionContext)
  const { ref, isDragSource } = useDraggable({ id: card.id, disabled: context?.disabled ?? true })
  return { ref, isDragSource, resetPointer: () => context?.resetPointer(), suppressClick: (detail: number) => detail > 0 && context?.suppression.current === card.id }
}
export function useStatusDrop(id: Id) { return useDroppable({ id, collisionDetector: pointerIntersection }) }
export function usePlacementMarker(status: ProjectBoard['statuses'][number]) {
  const preview = useContext(PreviewContext)
  if (!preview || preview.placement.statusId !== status.id) return undefined
  return preview.placement.beforeCardId ?? status.cards.find(card => card.id !== preview.card.id && cardPriority(card) < cardPriority(preview.card))?.id ?? null
}
