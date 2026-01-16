import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function listUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Erro ao listar usuários' });
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
        createdAt: true,
        _count: {
          select: {
            assignedConversations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const schema = z.object({
      email: z.string().email('Email inválido'),
      password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
      role: z.enum(['ADMIN', 'AGENT']).optional(),
      teamId: z.string().optional().nullable(),
    });

    const data = schema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'AGENT',
        teamId: data.teamId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: z.enum(['ADMIN', 'AGENT']).optional(),
      teamId: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: id },
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email já em uso' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        teamId: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    if (req.user!.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    await prisma.user.delete({
      where: { id },
    });

    return res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const schema = z.object({
      newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    });

    const { newPassword } = schema.parse(req.body);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
}
