export type NotificationsTab = 'history' | 'settings'

export function normalizeNotificationsTab(value: string | string[] | undefined): NotificationsTab {
  const firstValue = Array.isArray(value) ? value[0] : value
  return firstValue === 'settings' ? 'settings' : 'history'
}
