import type { ReactNode } from 'react'

const paths = {
  back: <path d="m14 6-6 6 6 6M8 12h13" />,
  edit: <><path d="m16 3 5 5-12 12H4v-5L16 3Z" /><path d="m13 6 5 5" /></>,
  delete: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  important: <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.1-5.6-2.9L6.4 20l1.1-6.1L3 9.5l6.2-.9Z" />,
  urgent: <path d="M12 4v10M12 19v1" />,
} satisfies Record<string, ReactNode>

export function BoardIcon({ name }: { name: keyof typeof paths }) {
  return <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>
}
