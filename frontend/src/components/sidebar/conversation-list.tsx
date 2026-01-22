'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Filter, MessageSquare, CheckCircle2, Clock, Archive } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials, truncate } from '@/lib/utils'
import { useAuthStore, useConversationStore } from '@/lib/store'
import { conversationsApi } from '@/lib/api'

interface ConversationListProps {
  onSelectConversation?: () => void
}

export function ConversationList({ onSelectConversation }: ConversationListProps) {
  const { token } = useAuthStore()
  const { conversations, setConversations, selectedConversation, selectConversation } =
    useConversationStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadConversations() {
      if (!token) return
      try {
        setLoading(true)
        const params: Record<string, string> = {}
        if (statusFilter !== 'all') {
          params.status = statusFilter
        }
        if (search) {
          params.search = search
        }
        const { conversations: data } = await conversationsApi.list(token, params)
        setConversations(data)
      } catch (error) {
        console.error('Error loading conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [token, statusFilter, search, setConversations])

  const handleSelectConversation = (conversation: any) => {
    selectConversation(conversation)
    onSelectConversation?.()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <MessageSquare className="h-3 w-3 text-blue-500" />
      case 'PENDING':
        return <Clock className="h-3 w-3 text-yellow-500" />
      case 'RESOLVED':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      default:
        return null
    }
  }

  const statusOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'OPEN', label: 'Abertas' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'RESOLVED', label: 'Resolvidas' },
  ]

  return (
    <div className="flex h-full flex-col border-r bg-white">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="mb-4 text-lg font-semibold">Conversas</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                {statusOptions.find((o) => o.value === statusFilter)?.label || 'Filtrar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Archive className="mb-2 h-12 w-12" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={cn(
                  'w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100',
                  selectedConversation?.id === conversation.id && 'bg-gray-100'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.contact.profilePic || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(conversation.contact.pushName || conversation.contact.phoneNumber || '?')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {conversation.contact.pushName || conversation.contact.phoneNumber}
                        {conversation.contact.isGroup && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Grupo
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {conversation.lastMessageAt
                          ? formatDistanceToNow(new Date(conversation.lastMessageAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {truncate(conversation.lastMessage || 'Sem mensagens', 40)}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getStatusIcon(conversation.status)}
                        {conversation.unreadCount > 0 && (
                          <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Labels */}
                    {conversation.labels && conversation.labels.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {conversation.labels.slice(0, 3).map((l: any) => (
                          <span
                            key={l.label.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: `${l.label.color}20`,
                              color: l.label.color,
                            }}
                          >
                            {l.label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
