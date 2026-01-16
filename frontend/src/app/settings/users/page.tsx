'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Users,
  Loader2,
  Trash2,
  Edit,
  Shield,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/store'
import { usersApi } from '@/lib/api'
import { getInitials } from '@/lib/utils'

interface UserType {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'ADMIN' | 'AGENT'
  isActive: boolean
  team?: { id: string; name: string }
}

export default function UsersPage() {
  const { token, user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT' as 'ADMIN' | 'AGENT',
  })

  useEffect(() => {
    loadUsers()
  }, [token])

  const loadUsers = async () => {
    if (!token) return
    try {
      setLoading(true)
      const { users: data } = await usersApi.list(token)
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setSaving(true)

      if (editingUser) {
        const { user } = await usersApi.update(token, editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        })
        setUsers(users.map(u => u.id === editingUser.id ? user : u))
      } else {
        const { user } = await usersApi.create(token, formData)
        setUsers([user, ...users])
      }

      resetForm()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: UserType) => {
    if (!token) return
    if (user.id === currentUser?.id) {
      alert('Você não pode excluir sua própria conta')
      return
    }
    if (!confirm(`Deseja excluir o usuário "${user.name}"?`)) return

    try {
      await usersApi.delete(token, user.id)
      setUsers(users.filter(u => u.id !== user.id))
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir')
    }
  }

  const handleEdit = (user: UserType) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'AGENT',
    })
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os agentes do sistema
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-6">
          <h3 className="font-semibold mb-4">
            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Senha</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Função</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'AGENT' })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="AGENT">Agente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Salvar' : 'Criar'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum usuário</h3>
          <p className="text-muted-foreground mb-4">
            Adicione usuários para gerenciar o atendimento
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-lg border bg-white p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{user.name}</h3>
                    {user.id === currentUser?.id && (
                      <Badge variant="outline" className="text-xs">Você</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="mr-1 h-3 w-3" />
                          Agente
                        </>
                      )}
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="destructive">Inativo</Badge>
                    )}
                  </div>
                </div>
              </div>

              {user.id !== currentUser?.id && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
