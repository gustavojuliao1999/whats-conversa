const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface FetchOptions extends RequestInit {
  token?: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Erro desconhecido')
  }

  return data
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    fetchApi<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  me: (token: string) =>
    fetchApi<{ user: any }>('/auth/me', { token }),

  updateProfile: (token: string, data: { name?: string; avatar?: string }) =>
    fetchApi<{ user: any }>('/auth/profile', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    fetchApi<{ message: string }>('/auth/password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// Instances
export const instancesApi = {
  list: (token: string) =>
    fetchApi<{ instances: any[] }>('/instances', { token }),

  create: (token: string, name: string) =>
    fetchApi<{ instance: any; qrcode: any }>('/instances', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    }),

  get: (token: string, id: string) =>
    fetchApi<{ instance: any }>(`/instances/${id}`, { token }),

  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/instances/${id}`, {
      method: 'DELETE',
      token,
    }),

  connect: (token: string, id: string) =>
    fetchApi<{ qrcode: any; instance: any }>(`/instances/${id}/connect`, {
      method: 'POST',
      token,
    }),

  status: (token: string, id: string) =>
    fetchApi<{ state: string; status: string }>(`/instances/${id}/status`, { token }),

  logout: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/instances/${id}/logout`, {
      method: 'POST',
      token,
    }),

  restart: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/instances/${id}/restart`, {
      method: 'POST',
      token,
    }),
}

// Conversations
export const conversationsApi = {
  list: (token: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params)
    return fetchApi<{ conversations: any[]; pagination: any }>(
      `/conversations?${searchParams.toString()}`,
      { token }
    )
  },

  stats: (token: string) =>
    fetchApi<{ stats: any }>('/conversations/stats', { token }),

  get: (token: string, id: string) =>
    fetchApi<{ conversation: any }>(`/conversations/${id}`, { token }),

  update: (token: string, id: string, data: any) =>
    fetchApi<{ conversation: any }>(`/conversations/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  assign: (token: string, id: string, assignedToId: string | null) =>
    fetchApi<{ conversation: any }>(`/conversations/${id}/assign`, {
      method: 'POST',
      token,
      body: JSON.stringify({ assignedToId }),
    }),

  resolve: (token: string, id: string) =>
    fetchApi<{ conversation: any }>(`/conversations/${id}/resolve`, {
      method: 'POST',
      token,
    }),

  reopen: (token: string, id: string) =>
    fetchApi<{ conversation: any }>(`/conversations/${id}/reopen`, {
      method: 'POST',
      token,
    }),

  addLabel: (token: string, id: string, labelId: string) =>
    fetchApi<{ conversation: any }>(`/conversations/${id}/labels`, {
      method: 'POST',
      token,
      body: JSON.stringify({ labelId }),
    }),

  removeLabel: (token: string, id: string, labelId: string) =>
    fetchApi<{ message: string }>(`/conversations/${id}/labels/${labelId}`, {
      method: 'DELETE',
      token,
    }),
}

// Messages
export const messagesApi = {
  list: (token: string, conversationId: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params)
    return fetchApi<{ messages: any[]; pagination: any }>(
      `/conversations/${conversationId}/messages?${searchParams.toString()}`,
      { token }
    )
  },

  sendText: (token: string, conversationId: string, text: string) =>
    fetchApi<{ message: any }>(`/conversations/${conversationId}/messages/text`, {
      method: 'POST',
      token,
      body: JSON.stringify({ text }),
    }),

  sendMedia: (token: string, conversationId: string, data: any) =>
    fetchApi<{ message: any }>(`/conversations/${conversationId}/messages/media`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  sendAudio: (token: string, conversationId: string, audio: string) =>
    fetchApi<{ message: any }>(`/conversations/${conversationId}/messages/audio`, {
      method: 'POST',
      token,
      body: JSON.stringify({ audio }),
    }),

  markAsRead: (token: string, conversationId: string) =>
    fetchApi<{ message: string }>(`/conversations/${conversationId}/messages/read`, {
      method: 'POST',
      token,
    }),

  sendTyping: (token: string, conversationId: string) =>
    fetchApi<{ message: string }>(`/conversations/${conversationId}/typing`, {
      method: 'POST',
      token,
    }),
  getMediaBase64: (token: string, messageId: string) =>
    fetchApi<{ base64: string; mimetype: string }>(`/messages/${messageId}/media`, {
      token,
    }),

  getMediaFileUrl: (messageId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    return `${API_URL}/messages/${messageId}/file`
  },
}

// Users
export const usersApi = {
  list: (token: string) =>
    fetchApi<{ users: any[] }>('/users', { token }),

  get: (token: string, id: string) =>
    fetchApi<{ user: any }>(`/users/${id}`, { token }),

  create: (token: string, data: any) =>
    fetchApi<{ user: any }>('/users', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: any) =>
    fetchApi<{ user: any }>(`/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
      token,
    }),

  resetPassword: (token: string, id: string, newPassword: string) =>
    fetchApi<{ message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      token,
      body: JSON.stringify({ newPassword }),
    }),
}

// Teams
export const teamsApi = {
  list: (token: string) =>
    fetchApi<{ teams: any[] }>('/teams', { token }),

  get: (token: string, id: string) =>
    fetchApi<{ team: any }>(`/teams/${id}`, { token }),

  create: (token: string, data: any) =>
    fetchApi<{ team: any }>('/teams', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: any) =>
    fetchApi<{ team: any }>(`/teams/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/teams/${id}`, {
      method: 'DELETE',
      token,
    }),

  addUser: (token: string, teamId: string, userId: string) =>
    fetchApi<{ user: any }>(`/teams/${teamId}/users`, {
      method: 'POST',
      token,
      body: JSON.stringify({ userId }),
    }),

  removeUser: (token: string, teamId: string, userId: string) =>
    fetchApi<{ user: any }>(`/teams/${teamId}/users/${userId}`, {
      method: 'DELETE',
      token,
    }),
}

// Labels
export const labelsApi = {
  list: (token: string) =>
    fetchApi<{ labels: any[] }>('/labels', { token }),

  create: (token: string, data: { name: string; color?: string }) =>
    fetchApi<{ label: any }>('/labels', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: { name?: string; color?: string }) =>
    fetchApi<{ label: any }>(`/labels/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    fetchApi<{ message: string }>(`/labels/${id}`, {
      method: 'DELETE',
      token,
    }),
}

export { ApiError }
