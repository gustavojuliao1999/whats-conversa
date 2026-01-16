'use client'

import { useState, useRef, KeyboardEvent, ChangeEvent, useEffect } from 'react'
import { Send, Paperclip, Smile, Mic, X, Image, FileText, Film, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AttachedFile {
  file: File
  preview?: string
  type: 'image' | 'video' | 'document' | 'audio'
}

interface MessageInputProps {
  onSendMessage: (text: string) => void
  onSendMedia?: (data: {
    mediatype: 'image' | 'video' | 'document' | 'audio'
    media: string
    caption?: string
    fileName?: string
    mimetype: string
  }) => void
  onSendAudio?: (audio: string) => void
  onTyping?: () => void
  disabled?: boolean
}

export function MessageInput({ onSendMessage, onSendMedia, onSendAudio, onTyping, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleSend = async () => {
    if (disabled || uploading) return

    // Se tem arquivo anexado, envia a mídia
    if (attachedFile && onSendMedia) {
      try {
        setUploading(true)
        const base64 = await fileToBase64(attachedFile.file)

        await onSendMedia({
          mediatype: attachedFile.type,
          media: base64,
          caption: message.trim() || undefined,
          fileName: attachedFile.file.name,
          mimetype: attachedFile.file.type,
        })

        setMessage('')
        setAttachedFile(null)
      } catch (error) {
        console.error('Error sending media:', error)
        alert('Erro ao enviar arquivo')
      } finally {
        setUploading(false)
      }
      return
    }

    // Senão, envia mensagem de texto
    const trimmed = message.trim()
    if (!trimmed) return

    onSendMessage(trimmed)
    setMessage('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    onTyping?.()

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleFileSelect = (type: 'image' | 'video' | 'document') => {
    if (!fileInputRef.current) return

    const accepts: Record<string, string> = {
      image: 'image/*',
      video: 'video/*',
      document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
    }

    fileInputRef.current.accept = accepts[type]
    fileInputRef.current.dataset.type = type
    fileInputRef.current.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const type = (e.target.dataset.type || 'document') as 'image' | 'video' | 'document'

    // Limitar tamanho do arquivo (16MB)
    const maxSize = 16 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo 16MB.')
      return
    }

    let preview: string | undefined

    if (type === 'image') {
      preview = URL.createObjectURL(file)
    }

    setAttachedFile({
      file,
      preview,
      type,
    })

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  const removeAttachment = () => {
    if (attachedFile?.preview) {
      URL.revokeObjectURL(attachedFile.preview)
    }
    setAttachedFile(null)
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />
      case 'video':
        return <Film className="h-8 w-8 text-purple-500" />
      default:
        return <FileText className="h-8 w-8 text-orange-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const startTime = Date.now()
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setRecordingTime(elapsed)
      }, 100)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Erro ao acessar microfone. Verifique as permissões.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()

      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    }

    setIsRecording(false)
    setAudioBlob(null)
    setRecordingTime(0)

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
  }

  const sendAudio = async () => {
    if (!audioBlob || !onSendAudio) return

    try {
      setUploading(true)

      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)

      reader.onloadend = async () => {
        const base64 = reader.result as string
        await onSendAudio(base64)
        setAudioBlob(null)
        setRecordingTime(0)
        setUploading(false)
      }

      reader.onerror = () => {
        console.error('Error converting audio to base64')
        alert('Erro ao processar áudio')
        setUploading(false)
      }
    } catch (error) {
      console.error('Error sending audio:', error)
      alert('Erro ao enviar áudio')
      setUploading(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  return (
    <div className="border-t bg-white p-4">
      {/* Recording UI */}
      {(isRecording || audioBlob) && (
        <div className="mb-3 rounded-lg border bg-gray-50 p-3">
          <div className="flex items-center gap-3">
            {isRecording ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 animate-pulse">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Gravando...</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRecordingTime(recordingTime)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelRecording}
                  className="shrink-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={stopRecording}
                  className="shrink-0 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <Square className="h-4 w-4 text-white" />
                </Button>
              </>
            ) : audioBlob ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Áudio gravado</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRecordingTime(recordingTime)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelRecording}
                  className="shrink-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={sendAudio}
                  disabled={uploading}
                  className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
                >
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Attachment Preview */}
      {attachedFile && !isRecording && !audioBlob && (
        <div className="mb-3 rounded-lg border bg-gray-50 p-3">
          <div className="flex items-center gap-3">
            {attachedFile.preview ? (
              <img
                src={attachedFile.preview}
                alt="Preview"
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200">
                {getFileIcon(attachedFile.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachedFile.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachedFile.file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeAttachment}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main input area - hidden when recording */}
      {!isRecording && !audioBlob && (
        <div className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Attachment button with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                disabled={disabled || uploading}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleFileSelect('image')}>
                <Image className="mr-2 h-4 w-4 text-blue-500" />
                Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileSelect('video')}>
                <Film className="mr-2 h-4 w-4 text-purple-500" />
                Vídeo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFileSelect('document')}>
                <FileText className="mr-2 h-4 w-4 text-orange-500" />
                Documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Input area */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? "Adicione uma legenda..." : "Digite uma mensagem..."}
              disabled={disabled || uploading}
              rows={1}
              className={cn(
                'w-full resize-none rounded-2xl border bg-gray-100 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                (disabled || uploading) && 'opacity-50 cursor-not-allowed'
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-1.5 right-1.5 text-muted-foreground hover:text-foreground"
              disabled={disabled || uploading}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          {/* Send/Voice button */}
          {message.trim() || attachedFile ? (
            <Button
              size="icon"
              className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
              onClick={handleSend}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled={disabled || uploading}
              onClick={startRecording}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
