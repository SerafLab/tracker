export const e2eBaseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? '4173'}/tracker/`

/** Browser storage every e2e context starts with: the first-visit install invitation is already dismissed. */
export const dismissedInstallInvitation = {
  cookies: [],
  origins: [{ origin: new URL(e2eBaseURL).origin, localStorage: [{ name: 'easytrack.installInvitationDismissed', value: '1' }] }],
}
