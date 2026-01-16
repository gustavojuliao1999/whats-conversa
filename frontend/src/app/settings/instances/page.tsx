'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Smartphone,
  Wifi,
  WifiOff,
  Loader2,
  Trash2,
  RefreshCw,
  LogOut,
  QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import { instancesApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Instance {
  id: string
  name: string
  phoneNumber?: string
  profileName?: string
  profilePicture?: string
  status: string
  qrCode?: string
}

export default function InstancesPage() {
  const { token } = useAuthStore()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null)

  useEffect(() => {
    loadInstances()
  }, [token])

  // Polling para atualizar status quando há QR Code aberto
  useEffect(() => {
    if (!qrCode || !selectedInstance || !token) return

    const interval = setInterval(async () => {
      try {
        const { status } = await instancesApi.status(token, selectedInstance.id)
        if (status === 'CONNECTED') {
          setQrCode(null)
          setSelectedInstance(null)
          loadInstances()
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }, 3000) // Verifica a cada 3 segundos

    return () => clearInterval(interval)
  }, [qrCode, selectedInstance, token])

  const loadInstances = async () => {
    if (!token) return
    try {
      setLoading(true)
      const { instances: data } = await instancesApi.list(token)
      setInstances(data)
    } catch (error) {
      console.error('Error loading instances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newInstanceName.trim()) return

    try {
      setCreating(true)
      const { instance, qrcode } = await instancesApi.create(token, newInstanceName.trim())
      setInstances([instance, ...instances])
      setNewInstanceName('')
      setShowCreateForm(false)

      if (qrcode?.base64) {
        setSelectedInstance(instance)
        setQrCode(qrcode.base64)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao criar instância')
    } finally {
      setCreating(false)
    }
  }

  const handleConnect = async (instance: Instance) => {
    if (!token) return

    try {
      setConnectingId(instance.id)
      const { qrcode } = await instancesApi.connect(token, instance.id)

      if (qrcode?.base64) {
        setSelectedInstance(instance)
        setQrCode(qrcode.base64)
      } else {
        await checkStatus(instance.id)
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao conectar')
    } finally {
      setConnectingId(null)
    }
  }

  const checkStatus = async (id: string) => {
    if (!token) return

    try {
      setCheckingStatusId(id)
      const { status } = await instancesApi.status(token, id)
      setInstances(prev => prev.map(i =>
        i.id === id ? { ...i, status } : i
      ))
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setCheckingStatusId(null)
    }
  }

  const handleLogout = async (instance: Instance) => {
    if (!token) return
    if (!confirm('Deseja desconectar esta instância?')) return

    try {
      await instancesApi.logout(token, instance.id)
      setInstances(instances.map(i =>
        i.id === instance.id ? { ...i, status: 'DISCONNECTED' } : i
      ))
    } catch (error: any) {
      alert(error.message || 'Erro ao desconectar')
    }
  }

  const handleDelete = async (instance: Instance) => {
    if (!token) return
    if (!confirm(`Deseja excluir a instância "${instance.name}"?`)) return

    try {
      await instancesApi.delete(token, instance.id)
      setInstances(instances.filter(i => i.id !== instance.id))
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        )
      case 'CONNECTING':
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Conectando
          </Badge>
        )
      case 'QRCODE':
        return (
          <Badge variant="secondary" className="gap-1">
            <QrCode className="h-3 w-3" />
            QR Code
          </Badge>
        )
      default:
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        )
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões com o WhatsApp
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Instância
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              placeholder="Nome da instância"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              required
            />
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateForm(false)}
            >
              Cancelar
            </Button>
          </form>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCode && selectedInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Escaneie o QR Code
            </h3>
            <div className="flex justify-center mb-4">
              <img
                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Abra o WhatsApp no seu celular e escaneie o código
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleConnect(selectedInstance)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setQrCode(null)
                  setSelectedInstance(null)
                  loadInstances()
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instances List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : instances.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma instância</h3>
          <p className="text-muted-foreground mb-4">
            Crie uma instância para conectar ao WhatsApp
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Instância
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {instances.map((instance) => (
            <div
              key={instance.id}
              className="rounded-lg border bg-white p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{instance.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(instance.status)}
                    {instance.phoneNumber && (
                      <span className="text-sm text-muted-foreground">
                        {instance.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão Atualizar Status */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => checkStatus(instance.id)}
                  disabled={checkingStatusId === instance.id}
                  title="Atualizar status"
                >
                  <RefreshCw className={cn(
                    "h-4 w-4",
                    checkingStatusId === instance.id && "animate-spin"
                  )} />
                </Button>

                {instance.status === 'CONNECTED' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLogout(instance)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(instance)}
                    disabled={connectingId === instance.id}
                  >
                    {connectingId === instance.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    Conectar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(instance)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
