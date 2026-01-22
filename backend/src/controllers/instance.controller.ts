import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { evolutionApi } from '../services/evolution-api.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { env } from '../config/env.js';

const createInstanceSchema = z.object({
  name: z.string().min(1, 'Nome da instância é obrigatório'),
});

export async function createInstance(req: AuthenticatedRequest, res: Response) {
  try {
    const { name } = createInstanceSchema.parse(req.body);

    const existingInstance = await prisma.instance.findUnique({
      where: { name },
    });

    if (existingInstance) {
      return res.status(400).json({ error: 'Já existe uma instância com esse nome' });
    }

    const baseWebhookUrl = env.WEBHOOK_URL || `${env.SERVER_URL}/api/webhook`;

    const evolutionResponse = await evolutionApi.createInstance({
      instanceName: name,
      qrcode: true,
      settings: {
        groupsIgnore: false,
      },
      webhook: {
        url: baseWebhookUrl,
        byEvents: false,
        base64: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'CONNECTION_UPDATE',
          'CONTACTS_UPDATE',
          'CHATS_UPDATE',
          'CHATS_DELETE',
          'PRESENCE_UPDATE',
          'SEND_MESSAGE',
        ],
      },
    }) as any;

    const instance = await prisma.instance.create({
      data: {
        name,
        apiKey: evolutionResponse.hash || evolutionResponse.apikey,
        qrCode: evolutionResponse.qrcode?.base64,
        status: evolutionResponse.qrcode ? 'QRCODE' : 'DISCONNECTED',
      },
    });

    return res.status(201).json({
      instance,
      qrcode: evolutionResponse.qrcode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create instance error:', error);
    return res.status(500).json({ error: 'Erro ao criar instância' });
  }
}

export async function listInstances(req: Request, res: Response) {
  try {
    const instances = await prisma.instance.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        profileName: true,
        profilePicture: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({ instances });
  } catch (error) {
    console.error('List instances error:', error);
    return res.status(500).json({ error: 'Erro ao listar instâncias' });
  }
}

export async function getInstance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    return res.json({ instance });
  } catch (error) {
    console.error('Get instance error:', error);
    return res.status(500).json({ error: 'Erro ao buscar instância' });
  }
}

export async function connectInstance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const response = await evolutionApi.connectInstance(
      instance.name,
      instance.apiKey || undefined
    ) as any;

    if (response.base64) {
      await prisma.instance.update({
        where: { id },
        data: {
          qrCode: response.base64,
          status: 'QRCODE',
        },
      });
    }

    return res.json({
      qrcode: response.base64 ? { base64: response.base64, code: response.code } : null,
      instance: response.instance,
    });
  } catch (error) {
    console.error('Connect instance error:', error);
    return res.status(500).json({ error: 'Erro ao conectar instância' });
  }
}

export async function getConnectionState(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const response = await evolutionApi.getConnectionState(
      instance.name,
      instance.apiKey || undefined
    ) as any;

    // A Evolution API retorna { instance: { instanceName, state } }
    const state = response?.instance?.state || response?.state || 'close';

    let status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'QRCODE' = 'DISCONNECTED';
    if (state === 'open') {
      status = 'CONNECTED';
    } else if (state === 'connecting') {
      status = 'CONNECTING';
    }

    if (instance.status !== status) {
      await prisma.instance.update({
        where: { id },
        data: {
          status,
          qrCode: status === 'CONNECTED' ? null : instance.qrCode,
        },
      });
    }

    return res.json({ state, status });
  } catch (error) {
    console.error('Get connection state error:', error);
    return res.status(500).json({ error: 'Erro ao verificar status da conexão' });
  }
}

export async function logoutInstance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await evolutionApi.logoutInstance(instance.name, instance.apiKey || undefined);

    await prisma.instance.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        qrCode: null,
        phoneNumber: null,
        profileName: null,
        profilePicture: null,
      },
    });

    return res.json({ message: 'Desconectado com sucesso' });
  } catch (error) {
    console.error('Logout instance error:', error);
    return res.status(500).json({ error: 'Erro ao desconectar instância' });
  }
}

export async function deleteInstance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    try {
      await evolutionApi.deleteInstance(instance.name);
    } catch (e) {
      console.warn('Error deleting from Evolution API:', e);
    }

    await prisma.instance.delete({
      where: { id },
    });

    return res.json({ message: 'Instância removida com sucesso' });
  } catch (error) {
    console.error('Delete instance error:', error);
    return res.status(500).json({ error: 'Erro ao remover instância' });
  }
}

export async function restartInstance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await evolutionApi.restartInstance(instance.name, instance.apiKey || undefined);

    return res.json({ message: 'Instância reiniciada' });
  } catch (error) {
    console.error('Restart instance error:', error);
    return res.status(500).json({ error: 'Erro ao reiniciar instância' });
  }
}
