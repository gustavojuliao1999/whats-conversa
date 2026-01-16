import { Request, Response } from 'express';
import { prisma } from '../services/prisma.service.js';
import { getIO } from '../websocket/socket.js';
import {
  WebhookPayload,
  MessageUpsertData,
  ConnectionUpdateData,
  QrCodeUpdateData,
} from '../types/index.js';
import { MessageType } from '@prisma/client';

function getMessageContent(messageData: MessageUpsertData): {
  content: string | null;
  type: MessageType;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
} {
  const message = messageData.message;

  if (!message) {
    return { content: null, type: 'TEXT' };
  }

  if (message.conversation) {
    return { content: message.conversation, type: 'TEXT' };
  }

  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, type: 'TEXT' };
  }

  if (message.imageMessage) {
    return {
      content: message.imageMessage.caption || null,
      type: 'IMAGE',
      mediaUrl: message.imageMessage.url,
      mediaMimeType: message.imageMessage.mimetype,
    };
  }

  if (message.videoMessage) {
    return {
      content: message.videoMessage.caption || null,
      type: 'VIDEO',
      mediaUrl: message.videoMessage.url,
      mediaMimeType: message.videoMessage.mimetype,
    };
  }

  if (message.audioMessage) {
    return {
      content: null,
      type: 'AUDIO',
      mediaUrl: message.audioMessage.url,
      mediaMimeType: message.audioMessage.mimetype,
    };
  }

  if (message.documentMessage) {
    return {
      content: null,
      type: 'DOCUMENT',
      mediaUrl: message.documentMessage.url,
      mediaMimeType: message.documentMessage.mimetype,
      mediaFileName: message.documentMessage.fileName || message.documentMessage.title,
    };
  }

  if (message.stickerMessage) {
    return {
      content: null,
      type: 'STICKER',
      mediaUrl: message.stickerMessage.url,
      mediaMimeType: message.stickerMessage.mimetype,
    };
  }

  if (message.locationMessage) {
    const loc = message.locationMessage;
    return {
      content: JSON.stringify({
        latitude: loc.degreesLatitude,
        longitude: loc.degreesLongitude,
        name: loc.name,
        address: loc.address,
      }),
      type: 'LOCATION',
    };
  }

  if (message.contactMessage) {
    return {
      content: JSON.stringify({
        displayName: message.contactMessage.displayName,
        vcard: message.contactMessage.vcard,
      }),
      type: 'CONTACT',
    };
  }

  if (message.reactionMessage) {
    return {
      content: message.reactionMessage.text,
      type: 'REACTION',
    };
  }

  return { content: null, type: 'TEXT' };
}

function getLastMessagePreview(type: MessageType, content: string | null): string {
  switch (type) {
    case 'TEXT':
      return content || '';
    case 'IMAGE':
      return content ? `[imagem] ${content}` : '[imagem]';
    case 'VIDEO':
      return content ? `[vídeo] ${content}` : '[vídeo]';
    case 'AUDIO':
      return '[áudio]';
    case 'DOCUMENT':
      return '[documento]';
    case 'STICKER':
      return '[figurinha]';
    case 'LOCATION':
      return '[localização]';
    case 'CONTACT':
      return '[contato]';
    case 'REACTION':
      return content || '';
    default:
      return '';
  }
}

async function handleMessagesUpsert(instanceName: string, data: MessageUpsertData[]) {
  const io = getIO();

  for (const messageData of data) {
    const key = messageData.key;
    if (!key || !key.remoteJid) continue;

    // Skip status messages
    if (key.remoteJid === 'status@broadcast') continue;

    const instance = await prisma.instance.findUnique({
      where: { name: instanceName },
    });

    if (!instance) continue;

    const remoteJid = key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');

    // Find or create contact
    let contact = await prisma.contact.findUnique({
      where: {
        instanceId_remoteJid: {
          instanceId: instance.id,
          remoteJid,
        },
      },
    });

    if (!contact) {
      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      contact = await prisma.contact.create({
        data: {
          instanceId: instance.id,
          remoteJid,
          pushName: messageData.pushName || phoneNumber,
          phoneNumber,
          isGroup,
        },
      });
    } else if (messageData.pushName && !contact.pushName) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: { pushName: messageData.pushName },
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        instanceId_contactId: {
          instanceId: instance.id,
          contactId: contact.id,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          instanceId: instance.id,
          contactId: contact.id,
          status: 'OPEN',
        },
      });
    }

    // Check if message already exists
    const existingMessage = await prisma.message.findUnique({
      where: {
        instanceId_messageId: {
          instanceId: instance.id,
          messageId: key.id,
        },
      },
    });

    if (existingMessage) continue;

    // Parse message content
    const { content, type, mediaUrl, mediaMimeType, mediaFileName } = getMessageContent(messageData);

    // Get quoted message ID
    let quotedMessageId: string | undefined;
    if (messageData.message?.extendedTextMessage?.contextInfo?.stanzaId) {
      quotedMessageId = messageData.message.extendedTextMessage.contextInfo.stanzaId;
    }

    // Create message
    const timestamp = messageData.messageTimestamp
      ? new Date(messageData.messageTimestamp * 1000)
      : new Date();

    const message = await prisma.message.create({
      data: {
        messageId: key.id,
        content,
        type,
        status: key.fromMe ? 'SENT' : 'DELIVERED',
        isFromMe: key.fromMe,
        timestamp,
        mediaUrl,
        mediaMimeType,
        mediaFileName,
        quotedMessageId,
        instanceId: instance.id,
        contactId: contact.id,
        conversationId: conversation.id,
      },
      include: {
        sentByUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Update conversation
    const lastMessage = getLastMessagePreview(type, content);
    const updateData: any = {
      lastMessage,
      lastMessageAt: timestamp,
    };

    if (!key.fromMe) {
      updateData.unreadCount = { increment: 1 };
      if (conversation.status === 'RESOLVED') {
        updateData.status = 'OPEN';
      }
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
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

    // Emit socket events
    // Emit to conversation room (for chat area)
    io.to(`conversation:${conversation.id}`).emit('message:new', message);
    // Emit globally for notifications (includes contact info for notification display)
    io.emit('message:new', {
      ...message,
      contact: contact,
      conversationId: conversation.id,
    });
    io.emit('conversation:update', updatedConversation);
  }
}

async function handleConnectionUpdate(instanceName: string, data: ConnectionUpdateData) {
  const io = getIO();

  const instance = await prisma.instance.findUnique({
    where: { name: instanceName },
  });

  if (!instance) return;

  let status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'QRCODE' = 'DISCONNECTED';

  switch (data.state) {
    case 'open':
      status = 'CONNECTED';
      break;
    case 'connecting':
      status = 'CONNECTING';
      break;
    case 'close':
      status = 'DISCONNECTED';
      break;
  }

  await prisma.instance.update({
    where: { id: instance.id },
    data: {
      status,
      qrCode: status === 'CONNECTED' ? null : instance.qrCode,
    },
  });

  io.emit('instance:status', {
    instanceId: instance.id,
    instanceName,
    status,
  });
}

async function handleQrCodeUpdate(instanceName: string, data: QrCodeUpdateData) {
  const io = getIO();

  const instance = await prisma.instance.findUnique({
    where: { name: instanceName },
  });

  if (!instance) return;

  if (data.qrcode?.base64) {
    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        qrCode: data.qrcode.base64,
        status: 'QRCODE',
      },
    });

    io.emit('instance:qrcode', {
      instanceId: instance.id,
      instanceName,
      qrcode: data.qrcode.base64,
    });
  }
}

async function handleMessagesUpdate(instanceName: string, data: any[]) {
  for (const update of data) {
    if (!update.key?.id) continue;

    const instance = await prisma.instance.findUnique({
      where: { name: instanceName },
    });

    if (!instance) continue;

    const message = await prisma.message.findUnique({
      where: {
        instanceId_messageId: {
          instanceId: instance.id,
          messageId: update.key.id,
        },
      },
    });

    if (!message) continue;

    let newStatus = message.status;

    if (update.update?.status) {
      switch (update.update.status) {
        case 2:
          newStatus = 'SENT';
          break;
        case 3:
          newStatus = 'DELIVERED';
          break;
        case 4:
          newStatus = 'READ';
          break;
      }
    }

    if (newStatus !== message.status) {
      await prisma.message.update({
        where: { id: message.id },
        data: { status: newStatus },
      });

      const io = getIO();
      io.to(`conversation:${message.conversationId}`).emit('message:update', {
        id: message.id,
        status: newStatus,
      });
    }
  }
}

export async function handleWebhook(req: Request, res: Response) {
  try {
    const payload = req.body as WebhookPayload;
    const { event, instance: instanceName, data } = payload;

    // Normalizar o evento para maiúsculas com underscore
    // Evolution API envia como "messages.upsert", normalizamos para "MESSAGES_UPSERT"
    const normalizedEvent = event.toUpperCase().replace(/\./g, '_');

    console.log(`Webhook received: ${event} (normalized: ${normalizedEvent}) for instance: ${instanceName}`);
    console.log('Payload data:', JSON.stringify(data));

    switch (normalizedEvent) {
      case 'MESSAGES_UPSERT':
        await handleMessagesUpsert(instanceName, Array.isArray(data) ? data : [data]);
        break;

      case 'MESSAGES_UPDATE':
        await handleMessagesUpdate(instanceName, Array.isArray(data) ? data : [data]);
        break;

      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(instanceName, data);
        break;

      case 'QRCODE_UPDATED':
      case 'QRCODE_UPDATE':
        await handleQrCodeUpdate(instanceName, data);
        break;

      case 'CONTACTS_UPSERT':
      case 'CONTACTS_UPDATE':
        // Handle contacts update if needed
        break;

      default:
        console.log(`Unhandled webhook event: ${event} (normalized: ${normalizedEvent})`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
