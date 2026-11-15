import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { localeStorageKey } from '../../i18n/locale'
import type { ProjectBoardRepository } from '../../features/project-board'
import { App } from '../app'

afterEach(() => { cleanup(); history.replaceState(null, '', '/') })

it.each([
  ['ru', ['Внешний вид', 'Данные', 'Приложение']],
  ['en', ['Appearance', 'Data', 'Application']],
] as const)('names and orders the settings sections in %s', async (locale, names) => {
  localStorage.setItem(localeStorageKey, locale)
  history.replaceState(null, '', '/#settings')
  render(<App repository={{ open: async () => {} } as ProjectBoardRepository} />)
  await screen.findByRole('region', { name: names[1] })
  const regions = within(screen.getByRole('main')).getAllByRole('region')
  expect(regions.map(region => within(region).getByRole('heading', { level: 2 }).textContent)).toEqual(names)
  for (const [index, region] of regions.entries()) expect(region).toHaveAccessibleName(names[index])
})
