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
  BarChart3,
  Menu,
  User,
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
import { useAuthStore, useUIStore } from '@/lib/store'
import { cn, getInitials } from '@/lib/utils'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  const handleLogout = () => {
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

  const isAdmin = user?.role === 'ADMIN'

  const navItems = [
    { href: '/dashboard', icon: MessageSquare, label: 'Conversas' },
    { href: '/dashboard/stats', icon: BarChart3, label: 'Estatísticas' },
    { href: '/settings/profile', icon: User, label: 'Meu Perfil' },
    { href: '/settings/instances', icon: Smartphone, label: 'Instâncias', adminOnly: true },
    { href: '/settings/users', icon: Users, label: 'Usuários', adminOnly: true },
    { href: '/settings/labels', icon: Tag, label: 'Etiquetas', adminOnly: true },
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
              <Settings className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">Configurações</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null

            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-100',
                  item.back && 'text-primary'
                )}
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
        <header className="flex h-16 items-center gap-4 border-b bg-white px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Configurações</span>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  )
}
