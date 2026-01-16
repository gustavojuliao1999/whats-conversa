'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  Settings,
  Users,
  Tag,
  Smartphone,
  LogOut,
  ChevronLeft,
  Menu,
  BarChart3,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore, useUIStore, useConversationStore } from '@/lib/store'
import { initSocket, disconnectSocket, onConnectionStatusChange, isSocketConnected, reconnectSocket, getSocket } from '@/lib/socket'
import { cn, getInitials } from '@/lib/utils'
import { NotificationSettings } from '@/components/notification-settings'
import { notifyNewMessage, requestNotificationPermission } from '@/lib/notifications'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, token, isAuthenticated, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { selectedConversation, updateConversation } = useConversationStore()
  const [mounted, setMounted] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    // Initialize socket
    if (token) {
      initSocket(token)
      setSocketConnected(isSocketConnected())
    }

    // Request notification permission
    requestNotificationPermission()

    // Listen for connection status changes
    const unsubscribe = onConnectionStatusChange((connected) => {
      setSocketConnected(connected)
    })

    return () => {
      unsubscribe()
      disconnectSocket()
    }
  }, [isAuthenticated, token, router])

  // Listen for socket events (notifications only - messages are handled by chat-area)
  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      console.log('Socket not available for notifications')
      return
    }

    console.log('Setting up notification listener')

    const handleNewMessage = (message: any) => {
      console.log('Received message:new event:', message)
      // Notifica se não for mensagem enviada pelo próprio usuário
      if (!message.isFromMe) {
        // Só notifica se não estiver na conversa ou se a janela não estiver focada
        const shouldNotify = !document.hasFocus() ||
          !selectedConversation ||
          selectedConversation.id !== message.conversationId

        console.log('Should notify:', shouldNotify, { hasFocus: document.hasFocus(), selectedConversation: selectedConversation?.id, messageConversation: message.conversationId })

        if (shouldNotify) {
          const senderName = message.contact?.pushName || message.contact?.phoneNumber || 'Nova mensagem'
          const preview = message.content || getMessagePreview(message.type)
          console.log('Calling notifyNewMessage:', { senderName, preview })
          notifyNewMessage(senderName, preview, message.conversationId)
        }
      }
    }

    const handleConversationUpdate = (conversation: any) => {
      updateConversation(conversation)
    }

    socket.on('message:new', handleNewMessage)
    socket.on('conversation:update', handleConversationUpdate)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('conversation:update', handleConversationUpdate)
    }
  }, [selectedConversation, updateConversation])

  function getMessagePreview(type: string): string {
    switch (type) {
      case 'IMAGE': return '[Imagem]'
      case 'VIDEO': return '[Vídeo]'
      case 'AUDIO': return '[Áudio]'
      case 'DOCUMENT': return '[Documento]'
      case 'STICKER': return '[Figurinha]'
      case 'LOCATION': return '[Localização]'
      case 'CONTACT': return '[Contato]'
      default: return ''
    }
  }

  const handleLogout = () => {
    disconnectSocket()
    logout()
    router.replace('/login')
  }

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const navItems = [
    { href: '/dashboard', icon: MessageSquare, label: 'Conversas' },
    { href: '/dashboard/stats', icon: BarChart3, label: 'Estatísticas' },
    { href: '/settings/instances', icon: Smartphone, label: 'Instâncias' },
    { href: '/settings/users', icon: Users, label: 'Usuários' },
    { href: '/settings/labels', icon: Tag, label: 'Etiquetas' },
    { href: '/settings', icon: Settings, label: 'Configurações' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r transition-transform duration-300 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">WhatsConversa</span>
              <button
                onClick={() => !socketConnected && reconnectSocket()}
                className={cn(
                  "flex items-center gap-1 text-xs",
                  socketConnected ? "text-green-600" : "text-red-500 cursor-pointer hover:underline"
                )}
                title={socketConnected ? "Conectado ao servidor" : "Clique para reconectar"}
              >
                {socketConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Reconectar
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationSettings />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isAdmin = user?.role === 'ADMIN'
            const isAdminOnly = ['Usuários', 'Instâncias', 'Etiquetas'].includes(item.label)

            if (isAdminOnly && !isAdmin) return null

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-gray-100">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user?.name || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <Settings className="mr-2 h-4 w-4" />
                  Meu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold">WhatsConversa</span>
          </div>
          <NotificationSettings />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  )
}
