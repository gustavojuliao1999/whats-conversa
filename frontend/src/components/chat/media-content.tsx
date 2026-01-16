'use client'

import { useState, useEffect } from 'react'
import { Play, FileText, Download, Loader2 } from 'lucide-react'
import { messagesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface MediaContentProps {
  messageId: string
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER'
  mediaUrl?: string
  mediaMimeType?: string
  mediaFileName?: string
  caption?: string
}

export function MediaContent({
  messageId,
  type,
  mediaUrl,
  mediaMimeType,
  mediaFileName,
  caption,
}: MediaContentProps) {
  const { token } = useAuthStore()
  const [mediaData, setMediaData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Check if media URL is encrypted WhatsApp URL
  const isEncryptedUrl = mediaUrl?.includes('mmg.whatsapp.net') || mediaUrl?.includes('.enc')

  useEffect(() => {
    // If URL is encrypted, fetch the base64
    if (isEncryptedUrl && token && !mediaData && !loading && !error) {
      fetchMedia()
    }
  }, [isEncryptedUrl, token, messageId])

  const fetchMedia = async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(false)
      const response = await messagesApi.getMediaBase64(token, messageId)

      // Format as data URL
      const dataUrl = response.base64.startsWith('data:')
        ? response.base64
        : `data:${response.mimetype};base64,${response.base64}`

      setMediaData(dataUrl)
    } catch (err) {
      console.error('Error fetching media:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const effectiveUrl = mediaData || (!isEncryptedUrl ? mediaUrl : null)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-black/5 rounded-lg min-w-[200px] min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || (!effectiveUrl && isEncryptedUrl)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 bg-black/5 rounded-lg min-w-[200px]">
        <p className="text-sm text-muted-foreground">Mídia não disponível</p>
        <button
          onClick={fetchMedia}
          className="text-xs text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

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
          onClick={(e) => {
            if (!effectiveUrl) {
              e.preventDefault()
              fetchMedia()
            }
          }}
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
