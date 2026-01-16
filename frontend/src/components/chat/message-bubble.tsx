'use client'

import { format } from 'date-fns'
import { Check, CheckCheck, Clock, AlertCircle, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaContent } from './media-content'

interface MessageBubbleProps {
  message: {
    id: string
    content?: string
    type: string
    status: string
    isFromMe: boolean
    timestamp: string
    mediaUrl?: string
    mediaMimeType?: string
    mediaFileName?: string
    sentByUser?: {
      id: string
      name: string
      avatar?: string
    }
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'PENDING':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'SENT':
        return <Check className="h-3 w-3 text-gray-400" />
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'FAILED':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
      case 'VIDEO':
      case 'AUDIO':
      case 'DOCUMENT':
      case 'STICKER':
        return (
          <MediaContent
            messageId={message.id}
            type={message.type as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER'}
            mediaUrl={message.mediaUrl}
            mediaMimeType={message.mediaMimeType}
            mediaFileName={message.mediaFileName}
            caption={message.content}
          />
        )

      case 'LOCATION':
        try {
          const location = JSON.parse(message.content || '{}')
          return (
            <div className="flex items-center gap-2 rounded-lg bg-black/5 p-3">
              <MapPin className="h-8 w-8 text-red-500" />
              <div>
                {location.name && <p className="font-medium">{location.name}</p>}
                {location.address && (
                  <p className="text-sm text-muted-foreground">{location.address}</p>
                )}
              </div>
            </div>
          )
        } catch {
          return <p className="text-sm">[Localização]</p>
        }

      case 'CONTACT':
        try {
          const contact = JSON.parse(message.content || '{}')
          return (
            <div className="flex items-center gap-3 rounded-lg bg-black/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{contact.displayName}</p>
                <p className="text-xs text-muted-foreground">Contato</p>
              </div>
            </div>
          )
        } catch {
          return <p className="text-sm">[Contato]</p>
        }

      case 'TEXT':
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>
    }
  }

  return (
    <div
      className={cn(
        'flex',
        message.isFromMe ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] px-4 py-2',
          message.isFromMe
            ? 'message-bubble-sent'
            : 'message-bubble-received'
        )}
      >
        {/* Agent name for sent messages */}
        {message.isFromMe && message.sentByUser && (
          <p className="mb-1 text-xs font-medium text-primary">
            {message.sentByUser.name}
          </p>
        )}

        {/* Content */}
        {renderContent()}

        {/* Timestamp and status */}
        <div className={cn(
          'mt-1 flex items-center gap-1',
          message.isFromMe ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] text-gray-500">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
          {message.isFromMe && getStatusIcon()}
        </div>
      </div>
    </div>
  )
}
