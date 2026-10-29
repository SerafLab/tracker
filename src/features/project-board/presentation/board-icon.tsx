import type { ReactNode } from 'react'

const paths = {
  left: <path d="m14 6-6 6 6 6M8 12h12" />,
  right: <path d="m10 6 6 6-6 6M4 12h12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  important: <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.1-5.6-2.9L6.4 20l1.1-6.1L3 9.5l6.2-.9Z" />,
  urgent: <path d="M12 4v10M12 19v1" />,
} satisfies Record<string, ReactNode>

export function BoardIcon({ name }: { name: keyof typeof paths }) {
  return <svg className="ui-icon" aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>
}
