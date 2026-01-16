'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Tag,
  Loader2,
  Trash2,
  Edit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/store'
import { labelsApi } from '@/lib/api'

interface Label {
  id: string
  name: string
  color: string
  _count?: { conversations: number }
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]

export default function LabelsPage() {
  const { token } = useAuthStore()
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  })

  useEffect(() => {
    loadLabels()
  }, [token])

  const loadLabels = async () => {
    if (!token) return
    try {
      setLoading(true)
      const { labels: data } = await labelsApi.list(token)
      setLabels(data)
    } catch (error) {
      console.error('Error loading labels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setSaving(true)

      if (editingLabel) {
        const { label } = await labelsApi.update(token, editingLabel.id, formData)
        setLabels(labels.map(l => l.id === editingLabel.id ? { ...l, ...label } : l))
      } else {
        const { label } = await labelsApi.create(token, formData)
        setLabels([label, ...labels])
      }

      resetForm()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (label: Label) => {
    if (!token) return
    if (!confirm(`Deseja excluir a etiqueta "${label.name}"?`)) return

    try {
      await labelsApi.delete(token, label.id)
      setLabels(labels.filter(l => l.id !== label.id))
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir')
    }
  }

  const handleEdit = (label: Label) => {
    setEditingLabel(label)
    setFormData({
      name: label.name,
      color: label.color,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingLabel(null)
    setFormData({
      name: '',
      color: '#3b82f6',
    })
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Etiquetas</h1>
          <p className="text-muted-foreground">
            Organize suas conversas com etiquetas coloridas
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Etiqueta
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-6">
          <h3 className="font-semibold mb-4">
            {editingLabel ? 'Editar Etiqueta' : 'Nova Etiqueta'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Urgente, VIP, Suporte..."
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded-full border-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: `${formData.color}20`,
                  color: formData.color,
                }}
              >
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                {formData.name || 'Preview'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLabel ? 'Salvar' : 'Criar'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Labels List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : labels.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma etiqueta</h3>
          <p className="text-muted-foreground mb-4">
            Crie etiquetas para organizar suas conversas
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Etiqueta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {labels.map((label) => (
            <div
              key={label.id}
              className="rounded-lg border bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                  }}
                >
                  <Tag className="mr-1.5 h-3.5 w-3.5" />
                  {label.name}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(label)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(label)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {label._count && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {label._count.conversations} conversa(s)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
