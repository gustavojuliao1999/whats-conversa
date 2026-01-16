import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function listTeams(req: AuthenticatedRequest, res: Response) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: {
            users: true,
            conversations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ teams });
  } catch (error) {
    console.error('List teams error:', error);
    return res.status(500).json({ error: 'Erro ao listar times' });
  }
}

export async function getTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Time não encontrado' });
    }

    return res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    return res.status(500).json({ error: 'Erro ao buscar time' });
  }
}

export async function createTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const team = await prisma.team.create({
      data,
    });

    return res.status(201).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create team error:', error);
    return res.status(500).json({ error: 'Erro ao criar time' });
  }
}

export async function updateTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
    });

    const data = schema.parse(req.body);

    const team = await prisma.team.update({
      where: { id },
      data,
    });

    return res.json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update team error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar time' });
  }
}

export async function deleteTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Remove team from users
    await prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    // Remove team from conversations
    await prisma.conversation.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    await prisma.team.delete({
      where: { id },
    });

    return res.json({ message: 'Time excluído com sucesso' });
  } catch (error) {
    console.error('Delete team error:', error);
    return res.status(500).json({ error: 'Erro ao excluir time' });
  }
}

export async function addUserToTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { teamId: id },
      select: {
        id: true,
        name: true,
        email: true,
        teamId: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Add user to team error:', error);
    return res.status(500).json({ error: 'Erro ao adicionar usuário ao time' });
  }
}

export async function removeUserFromTeam(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
      select: {
        id: true,
        name: true,
        email: true,
        teamId: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Remove user from team error:', error);
    return res.status(500).json({ error: 'Erro ao remover usuário do time' });
  }
}
