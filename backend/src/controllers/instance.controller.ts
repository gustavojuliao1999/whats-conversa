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
export async function syncConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findUnique({
      where: { id },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    if (instance.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    // Fetch all chats/conversations from Evolution API
    const chatsResponse = await evolutionApi.findChats(
      instance.name,
      instance.apiKey || undefined
    ) as any;

    // The API returns an array directly
    const chats = Array.isArray(chatsResponse) ? chatsResponse : (chatsResponse?.chats || []);

    if (!chats || chats.length === 0) {
      return res.status(200).json({ 
        message: 'Nenhuma conversa para sincronizar',
        synced: 0 
      });
    }

    let syncedConversations = 0;
    let syncedMessages = 0;

    // Process each chat
    for (const chat of chats) {
      try {
        // Extract phone number (clean all suffixes)
        const cleanPhoneNumber = chat.remoteJid
          .replace('@s.whatsapp.net', '')
          .replace('@g.us', '')
          .replace('@lid', '')
          .replace('@broadcast', '');

        // Get or create contact - try by remoteJid first, then by phoneNumber
        let contact = await prisma.contact.findFirst({
          where: {
            remoteJid: chat.remoteJid,
            instanceId: instance.id,
          },
        });

        // If not found by remoteJid and it's not a group, try to find by phone number
        if (!contact && !chat.remoteJid.endsWith('@g.us')) {
          contact = await prisma.contact.findFirst({
            where: {
              phoneNumber: cleanPhoneNumber,
              instanceId: instance.id,
              isGroup: false,
            },
          });
          
          // If found by phone number, update the remoteJid to the new one
          if (contact) {
            contact = await prisma.contact.update({
              where: { id: contact.id },
              data: { remoteJid: chat.remoteJid },
            });
          }
        }

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              remoteJid: chat.remoteJid,
              phoneNumber: cleanPhoneNumber,
              pushName: chat.pushName || '',
              profilePic: chat.profilePicUrl || null,
              isGroup: chat.remoteJid.endsWith('@g.us'),
              instanceId: instance.id,
            },
          });
        }

        // Get or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            contactId: contact.id,
            instanceId: instance.id,
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              contactId: contact.id,
              instanceId: instance.id,
              status: 'OPEN',
              unreadCount: chat.unreadCount || 0,
              lastMessage: '',
              lastMessageAt: new Date(),
            },
          });
          syncedConversations++;
        }

        // Fetch messages for this chat
        const messages = await evolutionApi.findMessages(
          instance.name,
          {
            where: {
              key: { remoteJid: chat.remoteJid },
            },
          },
          instance.apiKey || undefined
        ) as any;
        console.log(`Fetched ${messages?.messages?.records?.length || 0} messages for chat ${chat.remoteJid}`);
        console.log(messages);

        if (messages?.messages?.records) {
          for (const msg of messages.messages.records) {
            // Check if message already exists
            const existingMessage = await prisma.message.findFirst({
              where: {
                messageId: msg.key?.id,
                conversationId: conversation.id,
              },
            });

            if (existingMessage) {
              continue;
            }

            // Determine message type
            let messageType: string = 'TEXT';
            if (msg.message?.imageMessage) messageType = 'IMAGE';
            else if (msg.message?.videoMessage) messageType = 'VIDEO';
            else if (msg.message?.audioMessage) messageType = 'AUDIO';
            else if (msg.message?.documentMessage) messageType = 'DOCUMENT';
            else if (msg.message?.stickerMessage) messageType = 'STICKER';
            else if (msg.message?.locationMessage) messageType = 'LOCATION';
            else if (msg.message?.contactMessage) messageType = 'CONTACT';
            else if (msg.message?.reactionMessage) messageType = 'REACTION';

            // Extract content
            let content = '';
            if (msg.message?.conversation) {
              content = msg.message.conversation;
            } else if (msg.message?.extendedTextMessage) {
              content = msg.message.extendedTextMessage.text;
            } else if (msg.message?.imageMessage?.caption) {
              content = msg.message.imageMessage.caption;
            } else if (msg.message?.videoMessage?.caption) {
              content = msg.message.videoMessage.caption;
            } else if (msg.message?.documentMessage?.fileName) {
              content = msg.message.documentMessage.fileName;
            }

            // Determine if message is from the user or from me
            const isFromMe = msg.key?.fromMe || false;

            // Map status
            let status: string = 'DELIVERED';
            if (msg.status === 1) status = 'SENT';
            else if (msg.status === 2) status = 'DELIVERED';
            else if (msg.status === 3) status = 'READ';

            try {
              await prisma.message.create({
                data: {
                  messageId: msg.key?.id,
                  content: content || null,
                  type: messageType as any,
                  status: status as any,
                  isFromMe,
                  timestamp: new Date(msg.messageTimestamp * 1000),
                  mediaMimeType: msg.message?.imageMessage?.mimetype || 
                                msg.message?.videoMessage?.mimetype ||
                                msg.message?.audioMessage?.mimetype ||
                                msg.message?.documentMessage?.mimetype,
                  mediaFileName: msg.message?.documentMessage?.fileName,
                  instanceId: instance.id,
                  contactId: contact.id,
                  conversationId: conversation.id,
                },
              });
              syncedMessages++;
            } catch (error) {
              console.warn(`Error saving message ${msg.key?.id}:`, error);
            }
          }

          // Update conversation with last message
          if (messages.messages.records.length > 0) {
            const lastMessage = messages.messages.records[0];
            let lastMessageContent = '';
            
            if (lastMessage.message?.conversation) {
              lastMessageContent = lastMessage.message.conversation;
            } else if (lastMessage.message?.extendedTextMessage?.text) {
              lastMessageContent = lastMessage.message.extendedTextMessage.text;
            } else {
              lastMessageContent = '[mensagem de mídia]';
            }

            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                lastMessage: lastMessageContent,
                lastMessageAt: new Date(lastMessage.messageTimestamp * 1000),
              },
            });
          }
        }
      } catch (error) {
        console.warn(`Error processing chat ${chat.remoteJid}:`, error);
        // Continue with next chat if one fails
      }
    }

    return res.json({ 
      message: `Sincronização concluída: ${syncedConversations} conversas e ${syncedMessages} mensagens`,
      synced: {
        conversations: syncedConversations,
        messages: syncedMessages,
      }
    });
  } catch (error) {
    console.error('Sync conversations error:', error);
    return res.status(500).json({ error: 'Erro ao sincronizar conversas' });
  }
}