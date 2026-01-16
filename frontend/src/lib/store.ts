import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'ADMIN' | 'AGENT'
}

interface Conversation {
  id: string
  status: string
  unreadCount: number
  lastMessage?: string
  lastMessageAt?: string
  contact: {
    id: string
    remoteJid: string
    pushName?: string
    phoneNumber?: string
    profilePic?: string
    isGroup: boolean
  }
  instance: {
    id: string
    name: string
  }
  assignedTo?: {
    id: string
    name: string
    avatar?: string
  }
  labels: Array<{
    label: {
      id: string
      name: string
      color: string
    }
  }>
}

interface Message {
  id: string
  messageId: string
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

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}

interface ConversationState {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  messages: Message[]
  setConversations: (conversations: Conversation[]) => void
  selectConversation: (conversation: Conversation | null) => void
  updateConversation: (conversation: Partial<Conversation> & { id: string }) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, data: Partial<Message>) => void
}

interface UIState {
  sidebarOpen: boolean
  contactPanelOpen: boolean
  toggleSidebar: () => void
  toggleContactPanel: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
)

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  setConversations: (conversations) => set({ conversations }),
  selectConversation: (conversation) => set({ selectedConversation: conversation, messages: [] }),
  updateConversation: (updatedConversation) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === updatedConversation.id ? { ...conv, ...updatedConversation } : conv
      ),
      selectedConversation:
        state.selectedConversation?.id === updatedConversation.id
          ? { ...state.selectedConversation, ...updatedConversation }
          : state.selectedConversation,
    })),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      // Evita duplicatas verificando se a mensagem já existe
      const exists = state.messages.some((m) => m.id === message.id)
      if (exists) {
        return state
      }
      return {
        messages: [...state.messages, message],
      }
    }),
  updateMessage: (messageId, data) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...data } : msg
      ),
    })),
}))

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  contactPanelOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleContactPanel: () => set((state) => ({ contactPanelOpen: !state.contactPanelOpen })),
}))

interface NotificationSettings {
  enabled: boolean
  soundEnabled: boolean
  browserNotificationsEnabled: boolean
}

interface NotificationState {
  settings: NotificationSettings
  permissionGranted: boolean
  setSettings: (settings: Partial<NotificationSettings>) => void
  setPermissionGranted: (granted: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      settings: {
        enabled: true,
        soundEnabled: true,
        browserNotificationsEnabled: true,
      },
      permissionGranted: false,
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setPermissionGranted: (granted) => set({ permissionGranted: granted }),
    }),
    {
      name: 'notification-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
