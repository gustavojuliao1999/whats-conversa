'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotificationStore } from '@/lib/store'
import {
  requestNotificationPermission,
  checkNotificationPermission,
  playNotificationSound,
} from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function NotificationSettings() {
  const { settings, setSettings, permissionGranted, setPermissionGranted } = useNotificationStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Verifica permissão atual
    setPermissionGranted(checkNotificationPermission())
  }, [setPermissionGranted])

  const handleToggleNotifications = () => {
    setSettings({ enabled: !settings.enabled })
  }

  const handleToggleSound = () => {
    setSettings({ soundEnabled: !settings.soundEnabled })
  }

  const handleToggleBrowserNotifications = async () => {
    if (!permissionGranted && !settings.browserNotificationsEnabled) {
      const granted = await requestNotificationPermission()
      if (granted) {
        setSettings({ browserNotificationsEnabled: true })
      }
    } else {
      setSettings({ browserNotificationsEnabled: !settings.browserNotificationsEnabled })
    }
  }

  const handleTestSound = () => {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch((e) => console.log('Erro ao testar som:', e))
  }

  if (!mounted) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative',
            !settings.enabled && 'text-muted-foreground'
          )}
          title={settings.enabled ? 'Notificações ativadas' : 'Notificações desativadas'}
        >
          {settings.enabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          {settings.enabled && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Configurações de Notificação</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleToggleNotifications}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {settings.enabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              <span>Notificações</span>
            </div>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded',
                settings.enabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {settings.enabled ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleToggleSound}
          disabled={!settings.enabled}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span>Som</span>
            </div>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded',
                settings.soundEnabled && settings.enabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {settings.soundEnabled ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleToggleBrowserNotifications}
          disabled={!settings.enabled}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notificação do navegador</span>
            </div>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded',
                settings.browserNotificationsEnabled && settings.enabled && permissionGranted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {!permissionGranted
                ? 'Permitir'
                : settings.browserNotificationsEnabled
                ? 'Ativado'
                : 'Desativado'}
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleTestSound}>
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span>Testar som</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
