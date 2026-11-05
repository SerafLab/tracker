// Generates backup files (format v1) for manual and visual checks of restore.
// Usage: npm run fixtures:backup [-- <dir>]   (default: fixtures/backup)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const EXPORTED_AT = '2026-11-06T12:00:00.000Z'
const MINUTE = 60_000

// Texts the interface must survive.
const long = (word, length) => word.repeat(Math.ceil(length / word.length)).slice(0, length)
export const TEXT = {
  wordRu: long('Сверхдлинноесловобезединогопробела', 200),
  wordEn: long('Pneumonoultramicroscopicsilicovolcanoconiosis', 160),
  digits: long('1234567890', 120),
  nbsp: 'Неразрывные пробелы не дают перенести эту строку ни в одном месте до самого конца предложения',
  zeroWidth: `Невидимые${'​'}разрывы${'​'}внутри${'​'}слова${'​'}${long('абв', 120)}`,
  url: `https://example.com/${'very-long-path-segment/'.repeat(8)}?query=${long('x', 80)}&utm_source=backup-fixture#${long('anchor', 40)}`,
  email: 'очень.длинный.адрес.электронной.почты.для.проверки.переноса@example-with-a-very-long-domain-name.com',
  sentence: 'Это очень длинное предложение, которое специально написано так, чтобы занять несколько строк на карточке и проверить, как интерфейс переносит текст, обрезает его многоточием и не ломает высоту колонки при узком экране телефона шириной триста двадцать пикселей.',
  sentenceEn: 'This is a deliberately long English sentence that keeps going well past the width of a single card so that wrapping, clamping and ellipsis behaviour can be checked in every place where a name or a note is shown.',
  emoji: '👩‍👩‍👧‍👦 🏳️‍🌈 🇷🇺 👍🏽 🧑🏿‍💻 Семья, флаги, оттенки кожи и составные эмодзи',
  rtl: 'مرحبا بالعالم، هذا نص طويل باللغة العربية — שלום עולם, טקסט בעברית',
  cjk: '这是一个非常长的中文句子没有空格用于测试换行行为是否正确处理これは日本語のテキストです한국어텍스트도있습니다',
  combining: 'Z̤͔ͧ̑̓ä͖̭̈̇lͮ̒ͫǧ̗͚̚o̙̔ͮ̇͐̇ — диакритика: ё́, й̈, Å̊',
  html: '<script>alert("xss")</script> <b>не жирный</b> &amp; &lt;div&gt; <img src=x onerror=alert(1)>',
  markdown: '**не жирный** _не курсив_ # не заголовок `не код` [не ссылка](https://example.com) > не цитата',
  single: 'Я',
  multiline: 'Первая строка\nВторая строка\n\n\nПосле трёх переносов\n\tС табуляцией\n  С пробелами в начале строки\nПоследняя строка',
}
const paragraphs = count => Array.from({ length: count }, (_, index) => `${index + 1}. ${TEXT.sentence} ${TEXT.sentenceEn}`).join('\n\n')
export const LONG_DESCRIPTION = [paragraphs(20), TEXT.url, TEXT.wordRu, TEXT.multiline, paragraphs(20)].join('\n\n')

const priority = card => Number(card.important) * 2 + Number(card.urgent)

/** Builds normalized, integrity-valid data: positions run from zero and cards keep group order. */
function createBuilder(prefix) {
  const data = { projects: [], statuses: [], cards: [], notes: [] }
  const counters = {}
  const nextId = kind => `${prefix}-${kind}-${String((counters[kind] = (counters[kind] ?? 0) + 1)).padStart(5, '0')}`
  const pending = []

  function project(name, createdAt = '2026-01-15T09:00:00.000Z') {
    const record = { id: nextId('project'), name, createdAt }
    data.projects.push(record)
    let statusPosition = 0
    return {
      status(statusName) {
        const status = { id: nextId('status'), projectId: record.id, name: statusName, position: statusPosition++ }
        data.statuses.push(status)
        const cards = []
        pending.push(cards)
        return {
          /** notes: count, or an array of note specs { text, createdAt?, updatedAt? }. */
          card({ name, description = '', important = false, urgent = false, notes = [] }) {
            const card = { id: nextId('card'), statusId: status.id, name, description, position: 0, important, urgent }
            cards.push(card)
            data.cards.push(card)
            const specs = typeof notes === 'number' ? Array.from({ length: notes }, (_, index) => ({ text: noteText(index) })) : notes
            let time = Date.parse('2026-02-01T08:00:00.000Z')
            for (const spec of specs) {
              time += 37 * MINUTE
              const note = { id: nextId('note'), cardId: card.id, text: spec.text, createdAt: spec.createdAt ?? new Date(time).toISOString() }
              if (spec.updatedAt) note.updatedAt = spec.updatedAt
              data.notes.push(note)
            }
            return this
          },
        }
      },
    }
  }

  function build() {
    for (const cards of pending) {
      cards.sort((a, b) => priority(b) - priority(a)) // stable: keeps insertion order inside a group
      cards.forEach((card, position) => { card.position = position })
    }
    return { format: 'easytrack-backup', formatVersion: 1, exportedAt: EXPORTED_AT, app: { version: '0.1.0', commit: 'fixture' }, data }
  }

  return { project, build }
}

const noteTexts = [TEXT.sentence, 'Коротко.', TEXT.wordRu, TEXT.multiline, TEXT.url, TEXT.emoji, TEXT.sentenceEn, TEXT.rtl, TEXT.cjk, TEXT.nbsp, TEXT.html, TEXT.markdown]
const noteText = index => `#${index + 1}. ${noteTexts[index % noteTexts.length]}`
const groups = [
  { important: true, urgent: true, label: 'Важно и срочно' },
  { important: true, urgent: false, label: 'Важно' },
  { important: false, urgent: true, label: 'Срочно' },
  { important: false, urgent: false, label: 'Обычная' },
]

/** One project per kind of trouble; meant to be opened and looked at. */
export function edgeCasesBackup() {
  const b = createBuilder('edge')

  const texts = b.project('01 Длинные тексты везде')
  const textStatus = texts.status(TEXT.wordRu)
  for (const [key, value] of Object.entries(TEXT)) textStatus.card({ name: key === 'multiline' ? 'Многострочный текст' : value, description: value, notes: [{ text: value }] })
  texts.status(TEXT.sentence).card({ name: 'Описание на много абзацев', description: LONG_DESCRIPTION, notes: [{ text: LONG_DESCRIPTION }] })
  texts.status(TEXT.nbsp).card({ name: TEXT.wordEn, important: true, urgent: true, description: TEXT.sentenceEn, notes: 3 })
  texts.status(TEXT.emoji).card({ name: TEXT.emoji, notes: 1 })
  texts.status(TEXT.rtl).card({ name: TEXT.rtl, description: TEXT.rtl, notes: [{ text: TEXT.rtl }] })
  texts.status(TEXT.cjk).card({ name: TEXT.cjk, notes: [{ text: TEXT.cjk }] })
  texts.status(TEXT.single).card({ name: TEXT.single, description: TEXT.single, notes: [{ text: TEXT.single }] })

  const columns = b.project('02 Пятнадцать колонок')
  const columnCards = [0, 1, 3, 60, 2, 0, 12, 1, 5, 0, 25, 4, 1, 8, 2]
  columnCards.forEach((count, index) => {
    const status = columns.status(index === 6 ? TEXT.wordRu : index === 9 ? TEXT.sentence : `Колонка ${index + 1}${count === 0 ? ' (пустая)' : ` · ${count}`}`)
    for (let card = 0; card < count; card++) {
      const group = groups[card % groups.length]
      status.card({ name: card % 7 === 3 ? TEXT.sentence : `Карточка ${card + 1} — ${group.label}`, ...group, description: card % 5 === 0 ? TEXT.sentence : '', notes: card % 4 })
    }
  })

  const priorities = b.project('03 Группы важности')
  const mixed = priorities.status('Все четыре группы')
  for (let index = 0; index < 12; index++) {
    const group = groups[index % groups.length]
    mixed.card({ name: `${group.label} ${Math.floor(index / 4) + 1}${index % 3 === 0 ? ` ${TEXT.sentence}` : ''}`, ...group, notes: index % 3 })
  }
  for (const group of groups) {
    const status = priorities.status(`Только «${group.label}»`)
    for (let index = 0; index < 3; index++) status.card({ name: `${group.label} ${index + 1}`, ...group })
  }

  const notes = b.project('04 Заметки и даты')
  const counts = notes.status('Количество заметок')
  for (const count of [0, 1, 4, 5, 6, 30, 200]) counts.card({ name: `${count} заметок`, notes: count })
  notes.status('Даты')
    .card({ name: 'Отредактированные заметки', notes: [
      { text: 'Изменена через минуту', createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-03-01T10:01:00.000Z' },
      { text: 'Изменена через полгода', createdAt: '2026-03-01T11:00:00.000Z', updatedAt: '2026-09-01T11:00:00.000Z' },
      { text: 'Не менялась', createdAt: '2026-03-01T12:00:00.000Z' },
    ] })
    .card({ name: 'Одинаковое время', notes: ['Первая', 'Вторая', 'Третья'].map(text => ({ text: `${text} в одну миллисекунду`, createdAt: '2026-04-01T09:00:00.000Z' })) })
    .card({ name: 'Старые и будущие даты', notes: [
      { text: 'Начало века', createdAt: '2001-01-01T00:00:00.000Z' },
      { text: 'Високосный день', createdAt: '2024-02-29T23:59:59.999Z' },
      { text: 'Из будущего', createdAt: '2099-12-31T23:59:59.000Z' },
    ] })
    .card({ name: 'Смена суток, месяца и года (UTC)', notes: [
      { text: 'Последняя секунда года', createdAt: '2025-12-31T23:59:59.999Z' },
      { text: 'Первая миллисекунда года', createdAt: '2026-01-01T00:00:00.000Z' },
      { text: 'Конец июня', createdAt: '2026-06-30T23:30:00.000Z' },
      { text: 'Начало июля', createdAt: '2026-07-01T00:30:00.000Z' },
    ] })
    .card({ name: 'Длинные заметки', notes: [{ text: LONG_DESCRIPTION }, { text: TEXT.wordRu }, { text: TEXT.multiline }] })

  b.project('05 Проект без статусов')
  b.project('06 Проект без карточек').status('Пустой статус')
  b.project(TEXT.wordRu).status(TEXT.wordRu).card({ name: TEXT.wordRu, notes: [{ text: TEXT.wordRu }] })
  b.project(TEXT.sentence).status('Готово').card({ name: TEXT.sentence })
  b.project(TEXT.emoji).status('Готово').card({ name: TEXT.emoji })
  b.project(TEXT.rtl).status(TEXT.rtl).card({ name: TEXT.rtl })
  b.project(TEXT.cjk).status(TEXT.cjk).card({ name: TEXT.cjk })
  b.project(TEXT.html).status(TEXT.html).card({ name: TEXT.html, description: TEXT.html })
  b.project(TEXT.single).status(TEXT.single).card({ name: TEXT.single })
  // Enough tiles for the catalogue to scroll.
  for (let index = 1; index <= 12; index++) {
    const project = b.project(`Проект для прокрутки каталога ${index}`, `2026-01-${String(15 + index).padStart(2, '0')}T09:00:00.000Z`)
    const status = project.status('Входящие')
    for (let card = 0; card < index; card++) status.card({ name: `Задача ${card + 1}` })
  }
  return b.build()
}

/** Deterministic pseudo-random numbers (mulberry32). */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Load test: 10 projects × 8 statuses × 25 cards = 2000 cards, 10000 notes. */
export function volumeBackup() {
  const b = createBuilder('vol')
  const next = random(42)
  const noteCounts = Array.from({ length: 2000 }, () => Math.floor(next() * 11)) // 0..10, about 5 on average
  // Spread the difference one note per card so the total is exactly 10000 and no count goes negative.
  let diff = 10_000 - noteCounts.reduce((sum, count) => sum + count, 0)
  for (let index = 0; diff !== 0; index = (index + 1) % noteCounts.length) {
    if (diff > 0) { noteCounts[index]++; diff-- } else if (noteCounts[index] > 0) { noteCounts[index]--; diff++ }
  }
  let cardIndex = 0
  for (let p = 1; p <= 10; p++) {
    const project = b.project(`Нагрузка ${p}`, `2026-0${1 + (p % 9)}-01T09:00:00.000Z`)
    for (let s = 1; s <= 8; s++) {
      const status = project.status(`Статус ${s}`)
      for (let c = 1; c <= 25; c++) {
        const group = groups[Math.floor(next() * groups.length)]
        status.card({ name: `Карточка ${p}.${s}.${c} ${next() < 0.2 ? TEXT.sentence : ''}`.trim(), ...group, description: next() < 0.3 ? paragraphs(3) : '', notes: noteCounts[cardIndex++] })
      }
    }
  }
  return b.build()
}

/** Files that restore must reject without touching data. */
export function rejectedBackups() {
  const valid = edgeCasesBackup()
  const missingOwner = structuredClone(valid)
  missingOwner.data.cards[0].statusId = 'missing-status'
  // The note index sorts createdAt as a string, so only UTC "Z" dates keep the true order.
  const offsetDate = structuredClone(valid)
  offsetDate.data.notes[0].createdAt = '2026-06-30T23:30:00+03:00'
  return {
    'rejected-not-json.json': '{ "format": "easytrack-backup", "formatVersion": 1,',
    'rejected-other-format.json': JSON.stringify({ ...valid, format: 'other-app-backup' }, null, 2),
    'rejected-newer-version.json': JSON.stringify({ ...valid, formatVersion: 2 }, null, 2),
    'rejected-missing-owner.json': JSON.stringify(missingOwner, null, 2),
    'rejected-offset-date.json': JSON.stringify(offsetDate, null, 2),
  }
}

export function backupFixtureFiles() {
  return {
    'edge-cases.json': JSON.stringify(edgeCasesBackup(), null, 2),
    'volume.json': JSON.stringify(volumeBackup(), null, 2),
    ...rejectedBackups(),
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? 'fixtures/backup'
  mkdirSync(dir, { recursive: true })
  for (const [name, text] of Object.entries(backupFixtureFiles())) {
    writeFileSync(join(dir, name), `${text}\n`)
    console.log(`${join(dir, name)}  ${(text.length / 1024).toFixed(0)} KB`)
  }
}
