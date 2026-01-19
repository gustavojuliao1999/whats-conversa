'use client'

import { Play, FileText, Download } from 'lucide-react'
import { messagesApi } from '@/lib/api'

interface MediaContentProps {
  messageId: string
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER'
  mediaUrl?: string | null
  mediaMimeType?: string | null
  mediaFileName?: string | null
  caption?: string | null
}

export function MediaContent({
  messageId,
  type,
  mediaUrl,
  mediaMimeType,
  mediaFileName,
  caption,
}: MediaContentProps) {
  // Se não tem mediaUrl ou é URL criptografada do WhatsApp, usar a rota /file
  const isEncryptedUrl = mediaUrl?.includes('mmg.whatsapp.net') || mediaUrl?.includes('.enc')
  const needsProxy = !mediaUrl || isEncryptedUrl

  // URL efetiva: usa a rota /file do backend quando necessário
  const effectiveUrl = needsProxy && messageId
    ? messagesApi.getMediaFileUrl(messageId)
    : mediaUrl || undefined

  switch (type) {
    case 'IMAGE':
      return (
        <div className="space-y-1">
          {effectiveUrl && (
            <img
              src={effectiveUrl}
              alt="Image"
              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90"
              loading="lazy"
              onClick={() => window.open(effectiveUrl, '_blank')}
            />
          )}
          {caption && <p className="text-sm">{caption}</p>}
        </div>
      )

    case 'VIDEO':
      return (
        <div className="space-y-1">
          {effectiveUrl && (
            <div className="relative max-w-[280px]">
              <video
                src={effectiveUrl}
                controls
                className="rounded-lg"
              />
            </div>
          )}
          {caption && <p className="text-sm">{caption}</p>}
        </div>
      )

    case 'AUDIO':
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          {effectiveUrl ? (
            <audio src={effectiveUrl} controls className="h-10 flex-1" />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Play className="h-5 w-5" />
              <span className="text-sm">Áudio não disponível</span>
            </div>
          )}
        </div>
      )

    case 'DOCUMENT':
      return (
        <a
          href={effectiveUrl || '#'}
          download={mediaFileName || 'documento'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg bg-black/5 p-3 hover:bg-black/10"
        >
          <FileText className="h-8 w-8 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {mediaFileName || 'Documento'}
            </p>
            <p className="text-xs text-muted-foreground">
              {mediaMimeType || 'Arquivo'}
            </p>
          </div>
          <Download className="h-4 w-4 text-muted-foreground" />
        </a>
      )

    case 'STICKER':
      return effectiveUrl ? (
        <img
          src={effectiveUrl}
          alt="Sticker"
          className="h-32 w-32"
          loading="lazy"
        />
      ) : (
        <div className="h-32 w-32 flex items-center justify-center bg-black/5 rounded-lg">
          <p className="text-xs text-muted-foreground">Figurinha</p>
        </div>
      )

    default:
      return null
  }
}
