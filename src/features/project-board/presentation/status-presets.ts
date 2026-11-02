import type { TFunction } from 'i18next'

export const statusPresets = [
  { id: 'simple', label: 'presetSimple', statuses: ['presetToDo', 'presetInProgress', 'presetDone'] },
  { id: 'search', label: 'presetSearch', statuses: ['presetFound', 'presetConsidering', 'presetShortlisted', 'presetNotSuitable'] },
  { id: 'documents', label: 'presetDocuments', statuses: ['presetToPrepare', 'presetSubmitted', 'presetAwaiting', 'presetCompleted'] },
  { id: 'development', label: 'presetDevelopment', statuses: ['presetPlanned', 'presetOnHold', 'presetInDevelopment', 'presetInReview', 'presetDone'] },
  { id: 'job-search', label: 'presetJobSearch', statuses: ['presetInterested', 'presetApplied', 'presetInterviews', 'presetOffer', 'presetRejected'] },
  { id: 'empty', label: 'presetEmpty', statuses: [] },
] as const
export type StatusPresetId = typeof statusPresets[number]['id']
export const presetStatusNames = (id: StatusPresetId, t: TFunction): string[] => statusPresets.find(preset => preset.id === id)!.statuses.map(key => t(key))
