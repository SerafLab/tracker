import type { Backup } from '../../features/project-board'

const pad = (value: number) => String(value).padStart(2, '0')

/** `easytrack-backup-YYYY-MM-DD-HHmm.json` in local time. */
export const backupFileName = (date: Date) =>
  `easytrack-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`

function download(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Shares the copy on touch devices that can send files; otherwise (or if sharing fails) downloads it. A dismissed share sheet is not an error. */
export async function deliverBackup(backup: Backup, now = new Date()) {
  const file = new File([JSON.stringify(backup, null, 2)], backupFileName(now), { type: 'application/json' })
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return }
    catch (error) { if ((error as { name?: string } | null)?.name === 'AbortError') return }
  }
  download(file)
}
