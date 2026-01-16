'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  UserPlus,
  Tag,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { getInitials } from '@/lib/utils'
import { useAuthStore, useConversationStore } from '@/lib/store'
import { messagesApi, conversationsApi } from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface ChatAreaProps {
  onBack?: () => void
}

export function ChatArea({ onBack }: ChatAreaProps) {
  const { token } = useAuthStore()
  const {
    selectedConversation,
    selectConversation,
    messages,
    setMessages,
    addMessage,
    updateConversation,
  } = useConversationStore()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load messages when conversation is selected
  useEffect(() => {
    async function loadMessages() {
      if (!token || !selectedConversation) return

      try {
        setLoading(true)
        const { messages: data } = await messagesApi.list(token, selectedConversation.id)
        setMessages(data)

        // Mark as read
        if (selectedConversation.unreadCount > 0) {
          await messagesApi.markAsRead(token, selectedConversation.id)
          updateConversation({
            id: selectedConversation.id,
            unreadCount: 0,
          })
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [token, selectedConversation?.id])

  // Socket listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !selectedConversation) return

    socket.emit('conversation:join', selectedConversation.id)

    const handleNewMessage = (message: any) => {
      // Só adiciona se for da conversa selecionada
      if (message.conversationId === selectedConversation.id) {
        addMessage(message)
        scrollToBottom()
      }
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.emit('conversation:leave', selectedConversation.id)
      socket.off('message:new', handleNewMessage)
    }
  }, [selectedConversation?.id, addMessage])

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!token || !selectedConversation) return

    try {
      setSending(true)
      await messagesApi.sendText(token, selectedConversation.id, text)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleSendMedia = async (data: {
    mediatype: 'image' | 'video' | 'document' | 'audio'
    media: string
    caption?: string
    fileName?: string
    mimetype: string
  }) => {
    if (!token || !selectedConversation) return

    try {
      setSending(true)
      await messagesApi.sendMedia(token, selectedConversation.id, data)
    } catch (error) {
      console.error('Error sending media:', error)
      throw error
    } finally {
      setSending(false)
    }
  }

  const handleSendAudio = async (audio: string) => {
    if (!token || !selectedConversation) return

    try {
      setSending(true)
      await messagesApi.sendAudio(token, selectedConversation.id, audio)
    } catch (error) {
      console.error('Error sending audio:', error)
      throw error
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    if (!token || !selectedConversation) return
    messagesApi.sendTyping(token, selectedConversation.id).catch(console.error)
  }

  const handleResolve = async () => {
    if (!token || !selectedConversation) return
    try {
      await conversationsApi.resolve(token, selectedConversation.id)
      updateConversation({
        id: selectedConversation.id,
        status: 'RESOLVED',
      })
    } catch (error) {
      console.error('Error resolving conversation:', error)
    }
  }

  const handleReopen = async () => {
    if (!token || !selectedConversation) return
    try {
      await conversationsApi.reopen(token, selectedConversation.id)
      updateConversation({
        id: selectedConversation.id,
        status: 'OPEN',
      })
    } catch (error) {
      console.error('Error reopening conversation:', error)
    }
  }

  if (!selectedConversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-center">
        <div className="rounded-full bg-primary/10 p-6 mb-4">
          <svg
            className="h-16 w-16 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700">WhatsConversa</h3>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Selecione uma conversa para começar a atender
        </p>
      </div>
    )
  }

  const contact = selectedConversation.contact
  const isResolved = selectedConversation.status === 'RESOLVED'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.profilePic || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(contact.pushName || contact.phoneNumber || '?')}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-medium">{contact.pushName || contact.phoneNumber}</h3>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  selectedConversation.status === 'OPEN'
                    ? 'default'
                    : selectedConversation.status === 'RESOLVED'
                    ? 'success'
                    : 'warning'
                }
                className="text-xs"
              >
                {selectedConversation.status === 'OPEN' && 'Aberta'}
                {selectedConversation.status === 'PENDING' && 'Pendente'}
                {selectedConversation.status === 'RESOLVED' && 'Resolvida'}
              </Badge>
              {selectedConversation.assignedTo && (
                <span className="text-xs text-muted-foreground">
                  {selectedConversation.assignedTo.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isResolved ? (
                <DropdownMenuItem onClick={handleReopen}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reabrir conversa
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleResolve}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como resolvida
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserPlus className="mr-2 h-4 w-4" />
                Atribuir agente
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="mr-2 h-4 w-4" />
                Adicionar etiqueta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-background p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        onSendAudio={handleSendAudio}
        onTyping={handleTyping}
        disabled={sending || isResolved}
      />
    </div>
  )
}
