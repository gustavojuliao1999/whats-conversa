import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/prisma.service.js';
import { evolutionApi } from '../services/evolution-api.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { getIO } from '../websocket/socket.js';

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { conversationId } = req.params;

    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      before: z.string().optional(),
    });

    const params = schema.parse(req.query);
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '50');
    const skip = (page - 1) * limit;

    const where: any = { conversationId };

    if (params.before) {
      where.timestamp = { lt: new Date(params.before) };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          sentByUser: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return res.json({
      messages: messages.reverse(),
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
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
}

export async function sendTextMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { conversationId } = req.params;

    const schema = z.object({
      text: z.string().min(1, 'Mensagem não pode estar vazia'),
    });

    const { text } = schema.parse(req.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        instance: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (!conversation.instance || conversation.instance.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    const response = await evolutionApi.sendText(
      conversation.instance.name,
      {
        number: conversation.contact.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        text,
      },
      conversation.instance.apiKey || undefined
    ) as any;

    const message = await prisma.message.create({
      data: {
        messageId: response.key?.id || `local_${Date.now()}`,
        content: text,
        type: 'TEXT',
        status: 'SENT',
        isFromMe: true,
        timestamp: new Date(),
        instanceId: conversation.instanceId,
        contactId: conversation.contactId,
        conversationId: conversation.id,
        sentByUserId: req.user!.id,
      },
      include: {
        sentByUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: text,
        lastMessageAt: new Date(),
      },
    });

    const io = getIO();
    io.to(`conversation:${conversationId}`).emit('message:new', message);
    io.emit('conversation:update', {
      id: conversationId,
      lastMessage: text,
      lastMessageAt: new Date(),
    });

    return res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Send text message error:', error);
    return res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
}

export async function sendMediaMessage(req: AuthenticatedRequest, res: Response) {
  console.log('sendMediaMessage called');
  console.log('Request body:', req.body);
  try {
    const { conversationId } = req.params;

    const schema = z.object({
      mediatype: z.enum(['image', 'video', 'document', 'audio']),
      media: z.string(),
      caption: z.string().optional(),
      fileName: z.string().optional(),
      mimetype: z.string(),
    });

    const data = schema.parse(req.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        instance: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (!conversation.instance || conversation.instance.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    // Extract base64 from data URL if necessary
    let mediaData = data.media;
    if (data.media.startsWith('data:')) {
      // Format: data:image/png;base64,<base64_string>
      const base64Match = data.media.split(',')[1];
      if (base64Match) {
        mediaData = base64Match;
      }
    }

    const response = await evolutionApi.sendMedia(
      conversation.instance.name,
      {
        number: conversation.contact.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        mediatype: data.mediatype,
        mimetype: data.mimetype,
        caption: data.caption,
        media: mediaData,
        fileName: data.fileName,
      },
      conversation.instance.apiKey || undefined
    ) as any;

    const messageType = {
      image: 'IMAGE',
      video: 'VIDEO',
      document: 'DOCUMENT',
      audio: 'AUDIO',
    }[data.mediatype] as 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';

    const message = await prisma.message.create({
      data: {
        messageId: response.key?.id || `local_${Date.now()}`,
        content: data.caption || null,
        type: messageType,
        status: 'SENT',
        isFromMe: true,
        timestamp: new Date(),
        mediaUrl: null, // Não salvar base64, buscar sob demanda via getBase64FromMediaMessage
        mediaMimeType: data.mimetype,
        mediaFileName: data.fileName,
        instanceId: conversation.instanceId,
        contactId: conversation.contactId,
        conversationId: conversation.id,
        sentByUserId: req.user!.id,
      },
      include: {
        sentByUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    const lastMessageText = data.caption || `[${data.mediatype}]`;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: lastMessageText,
        lastMessageAt: new Date(),
      },
    });

    const io = getIO();
    io.to(`conversation:${conversationId}`).emit('message:new', message);
    io.emit('conversation:update', {
      id: conversationId,
      lastMessage: lastMessageText,
      lastMessageAt: new Date(),
    });

    return res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Send media message error:', error);
    return res.status(500).json({ error: 'Erro ao enviar mídia' });
  }
}

export async function sendAudioMessage(req: AuthenticatedRequest, res: Response) {
  console.log('sendAudioMessage called');
  try {
    const { conversationId } = req.params;

    const schema = z.object({
      audio: z.string(),
    });

    const { audio } = schema.parse(req.body);
    console.log('Audio length:', audio.length, 'starts with:', audio.substring(0, 50));

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        instance: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (!conversation.instance || conversation.instance.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    // Extract base64 from data URL if necessary
    let audioData = audio;
    if (audio.startsWith('data:')) {
      // Format: data:audio/webm;base64,<base64_string>
      const base64Match = audio.split(',')[1];
      if (base64Match) {
        audioData = base64Match;
      }
    }

    console.log('Sending audio to Evolution API, audioData length:', audioData.length);

    const response = await evolutionApi.sendAudio(
      conversation.instance.name,
      {
        number: conversation.contact.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        audio: audioData,
      },
      conversation.instance.apiKey || undefined
    ) as any;

    console.log('Evolution API response:', response);

    const message = await prisma.message.create({
      data: {
        messageId: response.key?.id || `local_${Date.now()}`,
        type: 'AUDIO',
        status: 'SENT',
        isFromMe: true,
        timestamp: new Date(),
        mediaUrl: null, // Não salvar base64, buscar sob demanda via getBase64FromMediaMessage
        mediaMimeType: 'audio/ogg',
        instanceId: conversation.instanceId,
        contactId: conversation.contactId,
        conversationId: conversation.id,
        sentByUserId: req.user!.id,
      },
      include: {
        sentByUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: '[audio]',
        lastMessageAt: new Date(),
      },
    });

    const io = getIO();
    io.to(`conversation:${conversationId}`).emit('message:new', message);
    io.emit('conversation:update', {
      id: conversationId,
      lastMessage: '[audio]',
      lastMessageAt: new Date(),
    });

    return res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Send audio message error:', error);
    return res.status(500).json({ error: 'Erro ao enviar áudio' });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        instance: true,
        messages: {
          where: { isFromMe: false, status: { not: 'READ' } },
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (conversation.instance?.status === 'CONNECTED' && conversation.messages.length > 0) {
      try {
        const contact = await prisma.contact.findUnique({
          where: { id: conversation.contactId },
        });

        if (contact) {
          await evolutionApi.markMessageAsRead(
            conversation.instance.name,
            conversation.messages.map((m) => ({
              remoteJid: contact.remoteJid,
              fromMe: false,
              id: m.messageId,
            })),
            conversation.instance.apiKey || undefined
          );
        }
      } catch (e) {
        console.warn('Error marking as read in Evolution:', e);
      }
    }

    await prisma.message.updateMany({
      where: {
        conversationId,
        isFromMe: false,
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return res.json({ message: 'Marcado como lido' });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ error: 'Erro ao marcar como lido' });
  }
}

export async function getMediaFile(req: AuthenticatedRequest, res: Response) {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            instance: true,
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    if (!message.conversation.instance || message.conversation.instance.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    // Verificar se é uma mensagem de mídia
    const mediaTypes = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'];
    if (!mediaTypes.includes(message.type)) {
      return res.status(400).json({ error: 'Mensagem não é mídia' });
    }

    try {
      const mediaData = await evolutionApi.getBase64FromMediaMessage(
        message.conversation.instance.name,
        message.messageId,
        message.conversation.instance.apiKey || undefined
      );

      // Converter base64 para buffer e retornar como arquivo
      const buffer = Buffer.from(mediaData.base64, 'base64');
      const mimetype = mediaData.mimetype || message.mediaMimeType || 'application/octet-stream';

      // Determinar extensão do arquivo
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'audio/ogg': 'ogg',
        'audio/ogg; codecs=opus': 'ogg',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'm4a',
        'application/pdf': 'pdf',
      };
      const ext = extMap[mimetype] || 'bin';
      const filename = message.mediaFileName || `media_${message.id}.${ext}`;

      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      return res.send(buffer);
    } catch (evolutionError: any) {
      console.error('Error fetching media from Evolution API:', evolutionError);
      return res.status(500).json({ error: 'Erro ao buscar mídia da Evolution API' });
    }
  } catch (error) {
    console.error('Get media file error:', error);
    return res.status(500).json({ error: 'Erro ao buscar mídia' });
  }
}

export async function sendTyping(req: AuthenticatedRequest, res: Response) {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        instance: true,
      },
    });

    if (!conversation || !conversation.instance) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (conversation.instance.status === 'CONNECTED') {
      await evolutionApi.sendPresence(
        conversation.instance.name,
        {
          number: conversation.contact.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
          delay: 3000,
          presence: 'composing',
        },
        conversation.instance.apiKey || undefined
      );
    }

    return res.json({ message: 'OK' });
  } catch (error) {
    console.error('Send typing error:', error);
    return res.status(500).json({ error: 'Erro ao enviar status' });
  }
}
