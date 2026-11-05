import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
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

const srgb = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }
function oklch([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(srgb)
  const [l, m, s] = [.4122214708 * lr + .5363325363 * lg + .0514459929 * lb, .2119034982 * lr + .6806995451 * lg + .1073969566 * lb, .0883024619 * lr + .2817188376 * lg + .6299787005 * lb].map(Math.cbrt)
  const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s
  const bb = .0259040371 * l + .7827717662 * m - .808675766 * s
  return { chroma: Math.hypot(a, bb), hue: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 }
}
function hslToRgb(h, s, l) {
  const k = n => (n + h / 30) % 12
  const f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [f(0), f(8), f(4)].map(v => v * 255)
}
function literals(css) {
  const found = []
  for (const [, hex] of css.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
    const full = hex.length <= 4 ? [...hex].map(c => c + c).join('') : hex
    found.push([`#${hex}`, [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))])
  }
  for (const [text, fn, args] of css.matchAll(/\b(rgba?|hsla?)\(([^)]*)\)/gi)) {
    const [a, b, c] = args.split(/[\s,/]+/).filter(Boolean).map(parseFloat)
    found.push([text, fn.startsWith('rgb') ? [a, b, c] : hslToRgb(a, b / 100, c / 100)])
  }
  return found
}
const isGreen = rgb => { const { chroma, hue } = oklch(rgb); return chroma > .01 && hue >= 100 && hue <= 200 }

test('no green literal colours remain outside the theme token blocks', () => {
  const dir = new URL('../src/dev/', import.meta.url)
  const files = [['src/styles.css', styles], ...readdirSync(dir).filter(name => name.endsWith('.css')).map(name => [`src/dev/${name}`, readFileSync(new URL(name, dir), 'utf8')])]
  for (const [name, css] of files) {
    const rules = css.replace(/:root(\[data-theme="ink"\])? \{[^}]*\}/g, '')
    const offenders = literals(rules).filter(([, rgb]) => isGreen(rgb)).map(([text]) => text)
    assert.deepEqual(offenders, [], `${name} has green literals outside theme tokens`)
  }
})

test('the green detector flags theme greens but not shared neutral or warm colours', () => {
  for (const token of Object.values(green)) if (token.startsWith('#') && token.length > 4) assert.ok(literals(token).every(([, rgb]) => rgb.every(Number.isFinite)))
  for (const hex of ['#a5b3a7', '#cbe2d1', '#315f48', '#e3ece4']) assert.ok(isGreen(literals(hex)[0][1]), hex)
  for (const hex of ['#fff', '#f1ebd8', '#f9e8e0', '#ad3026', '#7a271a', '#e7b8aa', '#f5f4f0']) assert.ok(!isGreen(literals(hex)[0][1]), hex)
  assert.ok(literals('0 4px 24px #0003')[0] && !isGreen(literals('#0003')[0][1]))
})
