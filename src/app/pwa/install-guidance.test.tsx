import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppBar } from '../../ui/app-bar'
import { ActionDialog } from '../../features/project-board'
import { InstallProvider } from './install-guidance'
import { dismissInvitation, installInvitationStorageKey, isAppleMobile, isInvitationDismissed, isStandalone, type DeferredInstallPrompt } from './install-state'

const originalUserAgent = navigator.userAgent
function setUserAgent(value: string) { Object.defineProperty(navigator, 'userAgent', { configurable: true, value }) }
function nativePrompt(outcome: 'accepted' | 'dismissed' = 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as DeferredInstallPrompt
  event.prompt = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome }) })
  return event
}

function Harness({ ready = false }: { ready?: boolean }) {
  return <InstallProvider ready={ready}><AppBar title="Каталог" /></InstallProvider>
}
/** Opens the application-bar settings and activates the installation entry with the given label. */
async function chooseEntry(user: UserEvent, name: string) {
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  await user.click(within(await screen.findByRole('menu', { name: 'Настройки' })).getByRole('menuitem', { name }))
}
const entryLabel = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: 'Настройки' }))
  const label = within(await screen.findByRole('menu', { name: 'Настройки' })).getAllByRole('menuitem')[0].textContent
  await user.keyboard('{Escape}')
  return label
}

beforeEach(() => localStorage.removeItem(installInvitationStorageKey))
afterEach(() => { cleanup(); setUserAgent(originalUserAgent); vi.unstubAllGlobals() })

describe('platform detection', () => {
  it('recognizes iPhone, iPad and iPadOS reporting a desktop Mac', () => {
    expect(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
    expect(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isAppleMobile('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false)
  })

  it('detects standalone display or iOS home-screen launch', () => {
    expect(isStandalone()).toBe(false)
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(display-mode: standalone)' }))
    expect(isStandalone()).toBe(true)
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    expect(isStandalone()).toBe(true)
    Reflect.deleteProperty(navigator, 'standalone')
  })
})

describe('invitation dismissal storage', () => {
  it('saves and reads the permanent dismissal', () => {
    expect(isInvitationDismissed()).toBe(false)
    dismissInvitation()
    expect(isInvitationDismissed()).toBe(true)
  })

  it('treats blocked storage as not dismissed and ignores write failures', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked') })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
    expect(isInvitationDismissed()).toBe(false)
    expect(() => dismissInvitation()).not.toThrow()
    getItem.mockRestore(); setItem.mockRestore()
  })
})

describe('settings installation entry', () => {
  it('opens manual guidance when a native install prompt is unavailable', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await chooseEntry(user, 'Как установить EasyTrack')
    expect(screen.getByRole('dialog', { name: 'Установить EasyTrack' })).toHaveTextContent('могут быть удалены при очистке данных сайта')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Настройки' })).toHaveFocus())
  })

  it('uses a deferred native install prompt only after an explicit action and saves an accepted installation', async () => {
    render(<Harness />)
    const event = nativePrompt('accepted')
    act(() => { dispatchEvent(event) })
    expect(event.defaultPrevented).toBe(true)
    const user = userEvent.setup()
    await chooseEntry(user, 'Установить EasyTrack')
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(await entryLabel(user)).toBe('Как установить EasyTrack')
    await vi.waitFor(() => expect(isInvitationDismissed()).toBe(true))
  })

  it('does not save a dismissed native prompt', async () => {
    render(<Harness />)
    act(() => { dispatchEvent(nativePrompt('dismissed')) })
    const user = userEvent.setup()
    await chooseEntry(user, 'Установить EasyTrack')
    expect(await entryLabel(user)).toBe('Как установить EasyTrack')
    await Promise.resolve()
    expect(isInvitationDismissed()).toBe(false)
  })

  it('saves the dismissal when the app is installed', async () => {
    render(<Harness />)
    act(() => { dispatchEvent(nativePrompt()) })
    const user = userEvent.setup()
    expect(await entryLabel(user)).toBe('Установить EasyTrack')
    act(() => { dispatchEvent(new Event('appinstalled')) })
    expect(await entryLabel(user)).toBe('Как установить EasyTrack')
    expect(isInvitationDismissed()).toBe(true)
  })

  it('explains iOS storage isolation, including iPadOS', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    const user = userEvent.setup()
    render(<Harness />)
    await chooseEntry(user, 'Как установить EasyTrack')
    expect(screen.getByRole('dialog')).toHaveTextContent('отдельно от Safari')
    Reflect.deleteProperty(navigator, 'maxTouchPoints')
  })

  it('offers local-data help inside the installed app', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const user = userEvent.setup()
    render(<Harness ready />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await chooseEntry(user, 'Где хранятся проекты')
    const dialog = screen.getByRole('dialog', { name: 'Где хранятся проекты' })
    expect(dialog).toHaveTextContent('Они не синхронизируются')
    expect(dialog).not.toHaveTextContent('Установите EasyTrack')
  })
})

describe('installation invitation', () => {
  it('closes without saving when the checkbox is unchecked', async () => {
    const user = userEvent.setup()
    render(<Harness ready />)
    const dialog = screen.getByRole('dialog', { name: 'EasyTrack можно установить' })
    expect(dialog).toHaveTextContent('работает без сети')
    expect(dialog).toHaveTextContent('могут быть удалены при очистке данных сайта')
    expect(screen.getByRole('checkbox', { name: 'Больше не показывать' })).not.toBeChecked()
    expect(within(dialog).queryByRole('button', { name: 'Установить EasyTrack' })).not.toBeInTheDocument()
    await user.click(within(dialog).getAllByRole('button', { name: 'Закрыть' }).at(-1)!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(isInvitationDismissed()).toBe(false)
  })

  it('saves the dismissal when closed with the checkbox, including Escape', async () => {
    const user = userEvent.setup()
    render(<Harness ready />)
    await user.click(screen.getByRole('checkbox', { name: 'Больше не показывать' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(isInvitationDismissed()).toBe(true)
  })

  it('gains the install action when a native prompt arrives while open, and closes when it is used', async () => {
    const user = userEvent.setup()
    render(<Harness ready />)
    const event = nativePrompt('accepted')
    act(() => { dispatchEvent(event) })
    await user.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Установить EasyTrack' }))
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await vi.waitFor(() => expect(isInvitationDismissed()).toBe(true))
  })

  it('stresses that Safari projects are not transferred on iOS', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    const user = userEvent.setup()
    render(<Harness ready />)
    expect(screen.getByRole('dialog')).toHaveTextContent('не переносятся в установленное приложение')
    expect(screen.getByRole('dialog')).toHaveTextContent('«Поделиться»')
  })
})

describe('invitation trigger', () => {
  function Launch() {
    const [ready, setReady] = useState(false)
    const [modal, setModal] = useState(false)
    return <InstallProvider ready={ready}><AppBar title="Каталог" /><button onClick={() => setModal(true)}>modal</button><button onClick={() => setReady(value => !value)}>ready</button>{modal ? <ActionDialog title="Другой диалог" onClose={() => setModal(false)}><p>…</p></ActionDialog> : null}</InstallProvider>
  }

  it('waits for a ready workspace and opens once per launch', async () => {
    const user = userEvent.setup()
    render(<Launch />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ready' }))
    expect(screen.getByRole('dialog', { name: 'EasyTrack можно установить' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    // Navigating through service states and back within the same launch does not reopen it.
    await user.click(screen.getByRole('button', { name: 'ready' }))
    await user.click(screen.getByRole('button', { name: 'ready' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(isInvitationDismissed()).toBe(false)
  })

  it('opens again on the next launch until dismissed permanently', async () => {
    const user = userEvent.setup()
    const first = render(<Harness ready />)
    await user.keyboard('{Escape}')
    first.unmount()
    const second = render(<Harness ready />)
    expect(screen.getByRole('dialog', { name: 'EasyTrack можно установить' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Больше не показывать' }))
    await user.keyboard('{Escape}')
    second.unmount()
    render(<Harness ready />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is skipped for the launch when another dialog is open as the workspace becomes ready', async () => {
    const user = userEvent.setup()
    render(<Launch />)
    await user.click(screen.getByRole('button', { name: 'modal' }))
    act(() => { (screen.getByRole('button', { name: 'ready', hidden: true }) as HTMLButtonElement).click() })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not open inside the installed app', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<Harness ready />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
