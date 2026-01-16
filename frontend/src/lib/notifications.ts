import { useNotificationStore } from './store'

let notificationSound: HTMLAudioElement | null = null

// Inicializa o áudio de notificação
function getNotificationSound(): HTMLAudioElement {
  if (!notificationSound && typeof window !== 'undefined') {
    notificationSound = new Audio('/notification.mp3')
    notificationSound.volume = 0.5
  }
  return notificationSound!
}

// Solicita permissão para notificações do navegador
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    useNotificationStore.getState().setPermissionGranted(true)
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    const granted = permission === 'granted'
    useNotificationStore.getState().setPermissionGranted(granted)
    return granted
  }

  return false
}

// Verifica se as notificações estão disponíveis
export function checkNotificationPermission(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

// Toca o som de notificação
export function playNotificationSound(): void {
  const { settings } = useNotificationStore.getState()

  console.log('playNotificationSound called, settings:', settings)

  if (!settings.enabled || !settings.soundEnabled) {
    console.log('Sound disabled')
    return
  }

  try {
    const sound = getNotificationSound()
    console.log('Playing sound...')
    sound.currentTime = 0
    sound.play().then(() => {
      console.log('Sound played successfully')
    }).catch((e) => {
      console.log('Não foi possível tocar o som de notificação:', e)
    })
  } catch (error) {
    console.error('Erro ao tocar som de notificação:', error)
  }
}

// Mostra notificação do navegador
export function showBrowserNotification(
  title: string,
  body: string,
  options?: {
    icon?: string
    tag?: string
    onClick?: () => void
  }
): void {
  const { settings, permissionGranted } = useNotificationStore.getState()

  if (!settings.enabled || !settings.browserNotificationsEnabled || !permissionGranted) {
    return
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/icon-192.png',
      tag: options?.tag,
      badge: '/icon-192.png',
    })

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus()
        options.onClick?.()
        notification.close()
      }
    }

    // Auto-fecha após 5 segundos
    setTimeout(() => notification.close(), 5000)
  } catch (error) {
    console.error('Erro ao mostrar notificação:', error)
  }
}

// Notifica nova mensagem (som + browser notification)
export function notifyNewMessage(
  senderName: string,
  messagePreview: string,
  conversationId: string,
  onClickCallback?: () => void
): void {
  const { settings } = useNotificationStore.getState()

  console.log('notifyNewMessage called:', { senderName, messagePreview, settings })

  if (!settings.enabled) {
    console.log('Notifications disabled')
    return
  }

  // Toca o som
  playNotificationSound()

  // Mostra notificação do navegador
  showBrowserNotification(senderName, messagePreview, {
    tag: `message-${conversationId}`,
    onClick: onClickCallback,
  })
}
