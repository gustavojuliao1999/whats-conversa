import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

let socket: Socket | null = null
let currentToken: string | null = null
let connectionStatusListeners: ((connected: boolean) => void)[] = []

export function initSocket(token: string): Socket {
  // Se já existe um socket conectado com o mesmo token, retorna ele
  if (socket?.connected && currentToken === token) {
    return socket
  }

  // Se existe um socket mas com token diferente, desconecta
  if (socket) {
    socket.disconnect()
    socket = null
  }

  currentToken = token

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'], // Fallback para polling se websocket falhar
    reconnection: true,
    reconnectionAttempts: Infinity, // Tenta reconectar indefinidamente
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000, // Máximo de 5 segundos entre tentativas
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id)
    notifyConnectionStatus(true)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
    notifyConnectionStatus(false)

    // Se o servidor desconectou, tenta reconectar manualmente
    if (reason === 'io server disconnect') {
      socket?.connect()
    }
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message)
    notifyConnectionStatus(false)
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts')
    notifyConnectionStatus(true)
  })

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Socket reconnection attempt:', attemptNumber)
  })

  socket.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error.message)
  })

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after all attempts')
    // Tenta novamente após 10 segundos
    setTimeout(() => {
      if (currentToken && (!socket || !socket.connected)) {
        console.log('Retrying socket connection...')
        socket?.connect()
      }
    }, 10000)
  })

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    currentToken = null
    notifyConnectionStatus(false)
  }
}

// Listeners para status da conexão
function notifyConnectionStatus(connected: boolean) {
  connectionStatusListeners.forEach(listener => listener(connected))
}

export function onConnectionStatusChange(listener: (connected: boolean) => void): () => void {
  connectionStatusListeners.push(listener)
  // Retorna função para remover o listener
  return () => {
    connectionStatusListeners = connectionStatusListeners.filter(l => l !== listener)
  }
}

// Força reconexão manual
export function reconnectSocket(): void {
  if (socket && !socket.connected) {
    console.log('Forcing socket reconnection...')
    socket.connect()
  } else if (!socket && currentToken) {
    initSocket(currentToken)
  }
}
