import { useTranslation } from 'react-i18next'
import { LanguageChoice } from '../../i18n/provider'
import { AppBar } from '../../ui/app-bar'
import { SettingsLayout, SettingsSection } from '../../ui/settings-page'
import { ThemeChoice } from '../../ui/theme-provider'
import { useBackup } from '../backup/backup-provider'
import { build } from '../build'
import { useInstallEntry } from '../pwa/install-guidance'

export function SettingsPage({ onBack, onReturn }: { onBack: () => void; onReturn: () => void }) {
  const { t } = useTranslation()
  const backup = useBackup()
  const install = useInstallEntry()
  const sections = [
    { id: 'settings-appearance', title: t('settingsAppearance'), content: <><LanguageChoice /><ThemeChoice /></> },
    backup ? { id: 'settings-data', title: t('settingsData'), content: <>
      <button className="button button-secondary" onClick={event => backup.exportBackup(event.currentTarget)}>{t('backupExport')}</button>
      <button className="button button-secondary" onClick={event => backup.startRestore(event.currentTarget)}>{t('backupRestore')}</button>
    </> } : null,
    { id: 'settings-application', title: t('settingsApplication'), content: <>
      {install ? <button className="button button-secondary" onClick={event => install.select(event.currentTarget)}>{install.label}</button> : null}
      <p className="settings-version">{t('appVersion', build)}</p>
    </> },
  ]
  return <>
    <AppBar title={t('settings')} onBack={onBack} onReturn={onReturn} />
    <SettingsLayout>
      {sections.map(section => section ? <SettingsSection key={section.id} id={section.id} title={section.title}>{section.content}</SettingsSection> : null)}
    </SettingsLayout>
  </>
}
