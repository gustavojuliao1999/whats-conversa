'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useConversationStore } from '@/lib/store'
import { conversationsApi, usersApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  MessageSquare, 
  Users, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react'

interface ConversationStats {
  total: number
  active: number
  resolved: number
  averageResponseTime: number
  messagesCount: number
}

interface UserStats {
  total: number
  active: number
  admins: number
  agents: number
}

export default function StatsPage() {
  const router = useRouter()
  const { isAuthenticated, user, token } = useAuthStore()
  const [conversationStats, setConversationStats] = useState<ConversationStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    // Only admins can view stats
    if (user?.role !== 'ADMIN') {
      router.replace('/dashboard')
      return
    }

    if (token) {
      fetchStats()
    }
  }, [isAuthenticated, user?.role, token, router])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch conversation stats
      if (token) {
        const conversationResponse = await conversationsApi.stats(token)
        setConversationStats(conversationResponse.stats)

        // Fetch user stats
        const usersResponse = await usersApi.list(token)
        const users = usersResponse.users
        
        const userStatsData: UserStats = {
          total: users.length,
          active: users.filter((u: any) => u.isActive).length,
          admins: users.filter((u: any) => u.role === 'ADMIN').length,
          agents: users.filter((u: any) => u.role === 'AGENT').length,
        }
        setUserStats(userStatsData)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total de Conversas',
      value: conversationStats?.total ?? 0,
      icon: MessageSquare,
      description: 'Conversas em aberto',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Conversas Ativas',
      value: conversationStats?.active ?? 0,
      icon: TrendingUp,
      description: 'Conversas em progresso',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'Conversas Resolvidas',
      value: conversationStats?.resolved ?? 0,
      icon: CheckCircle,
      description: 'Conversas finalizadas',
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Total de Mensagens',
      value: conversationStats?.messagesCount ?? 0,
      icon: MessageSquare,
      description: 'Mensagens enviadas',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ]

  const userCards = [
    {
      title: 'Total de Usuários',
      value: userStats?.total ?? 0,
      icon: Users,
      description: 'Usuários cadastrados',
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Usuários Ativos',
      value: userStats?.active ?? 0,
      icon: CheckCircle,
      description: 'Usuários ativos',
      color: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
    },
    {
      title: 'Administradores',
      value: userStats?.admins ?? 0,
      icon: AlertCircle,
      description: 'Administradores',
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Agentes',
      value: userStats?.agents ?? 0,
      icon: Users,
      description: 'Agentes de atendimento',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex-1 space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Estatísticas</h1>
            <p className="text-muted-foreground">Visão geral do sistema</p>
          </div>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Conversation Stats */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Estatísticas de Conversas</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, index) => {
              const Icon = card.icon
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* User Stats */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold">Estatísticas de Usuários</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {userCards.map((card, index) => {
              const Icon = card.icon
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumo
            </CardTitle>
            <CardDescription>Informações gerais do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio de Resposta</p>
                <p className="text-2xl font-bold">
                  {conversationStats?.averageResponseTime 
                    ? `${conversationStats.averageResponseTime}m` 
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Resolução</p>
                <p className="text-2xl font-bold">
                  {conversationStats?.total && conversationStats?.resolved
                    ? `${Math.round((conversationStats.resolved / conversationStats.total) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
