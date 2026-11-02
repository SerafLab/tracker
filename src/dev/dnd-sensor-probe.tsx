import { StrictMode, Fragment, useCallback, useMemo, useRef, useState, type ComponentProps, type RefObject } from 'react'
import { createRoot } from 'react-dom/client'
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react'
import { Accessibility, AutoScroller, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { pointerIntersection } from '@dnd-kit/collision'
import '../styles.css'
import './dnd-sensor-probe.css'

type Card = { id: string; name: string; column: string }
type Projection = { column: string; before: string | null }
const columns = ['Найдено', 'В работе', 'Пустой статус']
const plugins: ComponentProps<typeof DragDropProvider>['plugins'] = defaults => [...defaults.filter(plugin => plugin !== Accessibility && plugin !== AutoScroller), AutoScroller.configure({ acceleration: 15, threshold: { x: .2, y: .2 } })]
const seed: Card[] = Array.from({ length: 14 }, (_, index) => ({ id: `card-${index + 1}`, name: index ? `Тестовая карточка ${index + 1}` : 'Длинное название карточки: нажать, прокрутить или удержать', column: index < 9 ? columns[0] : columns[1] }))

function CardItem({ card, open, mark, suppression, dragging }: { card: Card; open(card: Card): void; mark(message: string): void; suppression: RefObject<string | null>; dragging: boolean }) {
  const { ref, isDragSource } = useDraggable({ id: card.id, data: { name: card.name } })
  const [menu, setMenu] = useState(false)
  return <li ref={ref} className="work-card surface-card probe-card" data-probe-card={card.id} data-dragging={isDragSource || undefined}
    onContextMenuCapture={event => { if (dragging) event.preventDefault() }}
    onClickCapture={event => { if (event.detail > 0 && suppression.current === card.id) { event.preventDefault(); event.stopPropagation(); mark('Связанный с переносом click подавлен') } }}>
    <div className="probe-card-heading"><a className="card-name card-detail-link" draggable={false} href={`#probe-card/${card.id}`} onClick={event => { event.preventDefault(); open(card) }}>{card.name}</a>
      <div className="probe-card-menu" data-no-drag><button className="button button-quiet button-icon" aria-label={`Меню ${card.id}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => { setMenu(value => !value); mark('Меню открыто без переноса') }} onKeyDown={event => { if (event.key === 'Escape') setMenu(false) }}><svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg></button>
        {menu ? <div role="menu" aria-label={`Действия ${card.id}`} className="probe-menu"><button role="menuitem" className="button" onClick={() => { setMenu(false); mark('Тестовое действие меню') }}>Проверить меню</button></div> : null}</div>
    </div>
    <div className="card-badges"><span className="card-badge card-badge-important">☆ Важная</span><span className="card-badge card-badge-urgent">! Срочная</span></div>
    <p className="probe-card-copy">Ссылка покрывает название, метки и свободную площадь.</p>
  </li>
}

function Column({ name, cards, active, preview, suppression, open, mark }: { name: string; cards: Card[]; active: string | null; preview: Projection | null; suppression: RefObject<string | null>; open(card: Card): void; mark(message: string): void }) {
  const { ref, isDropTarget } = useDroppable({ id: name, collisionDetector: pointerIntersection })
  return <article ref={ref} className="probe-column" data-probe-column={name} data-over={isDropTarget || undefined}><h2>{name}</h2><ul className="card-list probe-list">
    {cards.map(card => <Fragment key={card.id}>
      {preview?.column === name && preview.before === card.id ? <li className="probe-gap" aria-hidden="true">Место вставки</li> : null}
      <CardItem card={card} dragging={active === card.id} open={open} mark={mark} suppression={suppression} />
    </Fragment>)}
    {preview?.column === name && preview.before === null ? <li className="probe-gap" aria-hidden="true">Место вставки</li> : null}
    {cards.length === 0 ? <li className="probe-empty">Пустая цель переноса</li> : null}
  </ul></article>
}

function Probe() {
  const [cards, setCards] = useState(seed)
  const [active, setActive] = useState<string | null>(null)
  const [preview, setPreview] = useState<Projection | null>(null)
  const [opened, setOpened] = useState<Card | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [starts, setStarts] = useState(0), [opens, setOpens] = useState(0)
  const suppression = useRef<string | null>(null), activeRef = useRef<string | null>(null)
  const board = useRef<HTMLElement>(null)
  const mark = useCallback((message: string) => setLog(lines => [message, ...lines].slice(0, 12)), [])
  const sensors = useMemo(() => [PointerSensor.configure({
    activationConstraints: event => event.pointerType === 'touch' ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })] : [new PointerActivationConstraints.Distance({ value: 5 })],
    preventActivation: event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return true
      return event.target instanceof Element && !!event.target.closest('button,input,textarea,select,[contenteditable="true"],[data-no-drag],[role="menu"],[role="menuitem"]')
    },
  })], [])
  const project = (id: string, x: number, y: number): Projection | null => {
    const column = Array.from(board.current?.querySelectorAll<HTMLElement>('[data-probe-column]') ?? []).find(element => {
      const bounds = element.getBoundingClientRect()
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
    })
    if (!column) return null
    const next = Array.from(column.querySelectorAll<HTMLElement>('[data-probe-card]')).filter(element => element.dataset.probeCard !== id).find(element => { const box = element.getBoundingClientRect(); return y < box.top + box.height / 2 })
    return { column: column.dataset.probeColumn!, before: next?.dataset.probeCard ?? null }
  }
  const open = (card: Card) => { setOpened(card); setOpens(value => value + 1); mark(`Открытие ${card.id}`) }
  return <><header className="probe-header"><h1>Проверка удержания и прокрутки</h1><p>Только тестовые карточки в памяти. Данные EasyTrack не читаются и не изменяются.</p><p>Свайп — прокрутить. Удержание 250 мс — перенос. Короткое нажатие / Enter — открыть. Меню — отдельное действие.</p>
    <div className="probe-counters" role="status" data-starts={starts} data-opens={opens}>Начатых переносов: {starts}. Открытий: {opens}. {active ? 'Перенос активен' : 'Ожидание'}</div>
    <details><summary>Диагностика и журнал</summary><p className="probe-agent">{navigator.userAgent}</p><ol>{log.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ol></details></header>
    {opened ? <aside className="surface-card probe-detail" role="region" aria-label="Открытая карточка"><strong>{opened.name}</strong><p>Проверка открытия: карточка не должна появляться после drag/cancel/swipe.</p><button className="button button-primary" onClick={() => setOpened(null)}>Закрыть карточку</button></aside> : null}
    <DragDropProvider sensors={sensors} plugins={plugins}
      onDragStart={event => { const id = String(event.operation.source?.id); activeRef.current = id; suppression.current = id; setActive(id); setStarts(value => value + 1); mark(`start ${id}; ${event.nativeEvent?.type}`) }}
      onDragMove={event => { if (activeRef.current) { const point = event.operation.position.current; setPreview(project(activeRef.current, point.x, point.y)) } }}
      onDragOver={event => { if (activeRef.current) { const point = event.operation.position.current; setPreview(project(activeRef.current, point.x, point.y)) } }}
      onDragEnd={event => {
        const id = activeRef.current, point = event.operation.position.current
        const destination = id && !event.canceled ? project(id, point.x, point.y) : null
        if (destination && id) setCards(previous => {
          const card = previous.find(item => item.id === id)!
          const remaining = previous.filter(item => item.id !== id)
          const nextIndex = destination.before ? remaining.findIndex(item => item.id === destination.before) : remaining.findLastIndex(item => item.column === destination.column) + 1
          remaining.splice(nextIndex < 0 ? remaining.length : nextIndex, 0, { ...card, column: destination.column })
          return remaining
        })
        mark(`${event.canceled ? 'cancel' : destination ? 'drop' : 'outside'} ${id}`)
        activeRef.current = null; setActive(null); setPreview(null)
      }}>
      <main ref={board} className="probe-columns" onPointerDownCapture={event => { if (!activeRef.current) suppression.current = null; mark(`pointerdown ${event.pointerType}; touch-action=${getComputedStyle(event.currentTarget).touchAction}`) }}>
        {columns.map(name => <Column key={name} name={name} cards={cards.filter(card => card.column === name)} active={active} preview={preview} suppression={suppression} open={open} mark={mark} />)}
      </main>
      <DragOverlay dropAnimation={null}><div className="surface-card probe-overlay" inert aria-hidden="true">{cards.find(card => card.id === active)?.name}</div></DragOverlay>
    </DragDropProvider>
    <footer className="probe-footer">Проверить: оба свайпа, tap, hold, drop вне цели, отмену, следующее нажатие и прокрутку у краёв.</footer>
  </>
}

createRoot(document.getElementById('root')!).render(<StrictMode><Probe /></StrictMode>)
