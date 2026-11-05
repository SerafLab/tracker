import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const block = selector => Object.fromEntries([...styles.slice(styles.indexOf(`${selector} {`)).match(/\{([^}]*)\}/)[1].matchAll(/--([\w-]+): (#[0-9a-f]{3,6});/g)].map(match => [match[1], match[2]]))
const luminance = short => {
  const hex = short.length === 4 ? `#${[...short.slice(1)].map(c => c + c).join('')}` : short
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
  return .2126 * r + .7152 * g + .0722 * b
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05) }
const green = block(':root')
const ink = block(':root[data-theme="ink"]')

for (const [name, tokens] of [['green', green], ['ink', { ...green, ...ink }]]) {
  test(`${name} theme meets the legibility thresholds`, () => {
    for (const background of [tokens.canvas, tokens.surface, tokens.field]) {
      for (const text of ['text', 'text-secondary', 'text-muted']) assert.ok(contrast(tokens[text], background) >= 4.5, `${text} on ${background}`)
      assert.ok(contrast(tokens.focus, background) >= 3, `focus on ${background}`)
    }
    for (const accent of ['accent', 'accent-hover']) assert.ok(contrast('#ffffff', tokens[accent]) >= 4.5, accent)
    assert.ok(contrast(tokens['selection-text'], tokens['selection-bg']) >= 4.5, 'selection')
  })
}

test('ink overrides only theme tokens and leaves shared semantic colours alone', () => {
  for (const shared of ['canvas', 'surface', 'field', 'danger', 'danger-bg']) assert.ok(!(shared in ink), shared)
  assert.ok(Object.keys(ink).every(name => name in green))
})

test('no literal theme colours remain outside the token blocks', () => {
  const rules = styles.replace(/:root(\[data-theme="ink"\])? \{[^}]*\}/g, '')
  for (const literal of ['#a5b3a7', '#aeb9af', '#cbe2d1', '#193126', '#91b8a5', '#e3ece4', '#e3e7de', '#9aaa9c', '#838b81', '#cfd8d0', 'rgb(18 39 30', 'rgb(28 48 43']) assert.ok(!rules.includes(literal), literal)
})
