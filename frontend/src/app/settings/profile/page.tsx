'use client'

import { useState } from 'react'
import { Loader2, User, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const { token, user, setAuth } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const { user: updatedUser } = await authApi.updateProfile(token, { name })
      setAuth(updatedUser, token)
      setMessage('Perfil atualizado com sucesso!')
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    try {
      setChangingPassword(true)
      setError('')
      setMessage('')
      await authApi.changePassword(token, currentPassword, newPassword)
      setMessage('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Profile Info */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.avatar || ''} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {getInitials(user?.name || '?')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{user?.name}</h3>
            <p className="text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Agente'}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              <User className="inline mr-2 h-4 w-4" />
              Nome
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <Input value={user?.email || ''} disabled className="bg-gray-50" />
            <p className="mt-1 text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">
          <Lock className="inline mr-2 h-5 w-5" />
          Alterar Senha
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Senha Atual
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Nova Senha
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Confirmar Nova Senha
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={changingPassword}>
            {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alterar Senha
          </Button>
        </form>
      </div>
    </div>
  )
}
