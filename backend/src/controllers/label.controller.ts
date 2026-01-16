import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function listLabels(req: AuthenticatedRequest, res: Response) {
  try {
    const labels = await prisma.label.findMany({
      include: {
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ labels });
  } catch (error) {
    console.error('List labels error:', error);
    return res.status(500).json({ error: 'Erro ao listar etiquetas' });
  }
}

export async function createLabel(req: AuthenticatedRequest, res: Response) {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
    });

    const data = schema.parse(req.body);

    const label = await prisma.label.create({
      data: {
        name: data.name,
        color: data.color || '#6366f1',
      },
    });

    return res.status(201).json({ label });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create label error:', error);
    return res.status(500).json({ error: 'Erro ao criar etiqueta' });
  }
}

export async function updateLabel(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const schema = z.object({
      name: z.string().min(1).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });

    const data = schema.parse(req.body);

    const label = await prisma.label.update({
      where: { id },
      data,
    });

    return res.json({ label });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update label error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar etiqueta' });
  }
}

export async function deleteLabel(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    await prisma.label.delete({
      where: { id },
    });

    return res.json({ message: 'Etiqueta excluída com sucesso' });
  } catch (error) {
    console.error('Delete label error:', error);
    return res.status(500).json({ error: 'Erro ao excluir etiqueta' });
  }
}
