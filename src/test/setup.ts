import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

import { beforeEach } from 'vitest'
import { createLocaleInstance, localeStorageKey } from '../i18n/locale'
createLocaleInstance('ru')
beforeEach(() => { localStorage.clear(); localStorage.setItem(localeStorageKey, 'ru') })

// jsdom has no top layer. Browser tests exercise actual popover visibility and placement.
Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value(this: HTMLElement) { this.style.display = 'grid' } })
