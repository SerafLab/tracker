import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

import { beforeEach } from 'vitest'
import { createLocaleInstance, localeStorageKey } from '../i18n/locale'
import { installInvitationStorageKey } from '../app/pwa/install-state'
import { simulateUpdateReady } from './pwa-register'
createLocaleInstance('ru')
// Tests start with the first-visit install invitation dismissed; invitation tests remove the flag.
beforeEach(() => { simulateUpdateReady(false); localStorage.clear(); localStorage.setItem(localeStorageKey, 'ru'); localStorage.setItem(installInvitationStorageKey, '1') })

// jsdom has no top layer. Browser tests exercise actual popover visibility and placement.
Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'grid' } })
