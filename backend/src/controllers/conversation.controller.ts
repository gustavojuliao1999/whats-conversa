import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { ConversationStatus } from '@prisma/client';

export async function listConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const schema = z.object({
      status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'SPAM', 'all']).optional(),
      instanceId: z.string().optional(),
      assignedToId: z.string().optional(),
      unassigned: z.string().optional(),
      labelId: z.string().optional(),
      search: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    const params = schema.parse(req.query);
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '50');
    const skip = (page - 1) * limit;

    const where: any = {
      isArchived: false,
    };

    if (params.status && params.status !== 'all') {
      where.status = params.status as ConversationStatus;
    }

    if (params.instanceId) {
      where.instanceId = params.instanceId;
    }

    if (params.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    if (params.unassigned === 'true') {
      where.assignedToId = null;
    }

    if (params.labelId) {
      where.labels = {
        some: {
          labelId: params.labelId,
        },
      };
    }

    if (params.search) {
      where.OR = [
        { contact: { pushName: { contains: params.search, mode: 'insensitive' } } },
        { contact: { phoneNumber: { contains: params.search } } },
        { lastMessage: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: true,
          instance: {
            select: { id: true, name: true, profilePicture: true },
          },
          assignedTo: {
            select: { id: true, name: true, avatar: true },
          },
          labels: {
            include: { label: true },
          },
        },
        orderBy: [
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('List conversations error:', error);
    return res.status(500).json({ error: 'Erro ao listar conversas' });
  }
}

export async function getConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        instance: {
          select: { id: true, name: true, profilePicture: true },
        },
        assignedTo: {
          select: { id: true, name: true, avatar: true },
        },
        team: true,
        labels: {
          include: { label: true },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    return res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ error: 'Erro ao buscar conversa' });
  }
}

export async function updateConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const schema = z.object({
      status: z.enum(['OPEN', 'PENDING', 'RESOLVED', 'SPAM']).optional(),
      assignedToId: z.string().nullable().optional(),
      teamId: z.string().nullable().optional(),
      priority: z.number().optional(),
      notes: z.string().nullable().optional(),
      isArchived: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const conversation = await prisma.conversation.update({
      where: { id },
      data,
      include: {
        contact: true,
        instance: {
          select: { id: true, name: true, profilePicture: true },
        },
        assignedTo: {
          select: { id: true, name: true, avatar: true },
        },
        labels: {
          include: { label: true },
        },
      },
    });

    return res.json({ conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update conversation error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar conversa' });
  }
}

export async function assignConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { assignedToId },
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return res.json({ conversation });
  } catch (error) {
    console.error('Assign conversation error:', error);
    return res.status(500).json({ error: 'Erro ao atribuir conversa' });
  }
}

export async function resolveConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });

    return res.json({ conversation });
  } catch (error) {
    console.error('Resolve conversation error:', error);
    return res.status(500).json({ error: 'Erro ao resolver conversa' });
  }
}

export async function reopenConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'OPEN' },
    });

    return res.json({ conversation });
  } catch (error) {
    console.error('Reopen conversation error:', error);
    return res.status(500).json({ error: 'Erro ao reabrir conversa' });
  }
}

export async function addLabel(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { labelId } = req.body;

    await prisma.conversationLabel.create({
      data: {
        conversationId: id,
        labelId,
      },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        labels: {
          include: { label: true },
        },
      },
    });

    return res.json({ conversation });
  } catch (error) {
    console.error('Add label error:', error);
    return res.status(500).json({ error: 'Erro ao adicionar etiqueta' });
  }
}

export async function removeLabel(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, labelId } = req.params;

    await prisma.conversationLabel.delete({
      where: {
        conversationId_labelId: {
          conversationId: id,
          labelId,
        },
      },
    });

    return res.json({ message: 'Etiqueta removida' });
  } catch (error) {
    console.error('Remove label error:', error);
    return res.status(500).json({ error: 'Erro ao remover etiqueta' });
  }
}

export async function getConversationStats(req: AuthenticatedRequest, res: Response) {
  try {
    const [open, pending, resolved, unassigned] = await Promise.all([
      prisma.conversation.count({ where: { status: 'OPEN', isArchived: false } }),
      prisma.conversation.count({ where: { status: 'PENDING', isArchived: false } }),
      prisma.conversation.count({ where: { status: 'RESOLVED', isArchived: false } }),
      prisma.conversation.count({ where: { assignedToId: null, status: 'OPEN', isArchived: false } }),
    ]);

    return res.json({
      stats: {
        open,
        pending,
        resolved,
        unassigned,
        total: open + pending + resolved,
      },
    });
  } catch (error) {
    console.error('Get conversation stats error:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
}
