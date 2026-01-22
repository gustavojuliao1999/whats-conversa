import { env } from '../config/env.js';

interface WebhookConfig {
  url: string;
  byEvents?: boolean;
  base64?: boolean;
  headers?: Record<string, string>;
  events?: string[];
}

interface CreateInstanceOptions {
  instanceName: string;
  qrcode?: boolean;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS' | 'EVOLUTION';
  webhook?: WebhookConfig;
}

interface SendTextOptions {
  number: string;
  text: string;
  delay?: number;
}

interface SendMediaOptions {
  number: string;
  mediatype: 'image' | 'video' | 'document' | 'audio';
  mimetype: string;
  caption?: string;
  media: string;
  fileName?: string;
}

interface EvolutionApiError {
  statusCode: number;
  message: string;
  error?: string;
}

class EvolutionApiService {
  private baseUrl: string;
  private globalApiKey: string;

  constructor() {
    this.baseUrl = env.EVOLUTION_API_URL;
    this.globalApiKey = env.EVOLUTION_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    instanceApiKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const apiKey = instanceApiKey || this.globalApiKey;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as EvolutionApiError;
      throw new Error(error.message || `Evolution API error: ${response.status}`);
    }

    return data as T;
  }

  // Instance Management
  async createInstance(options: CreateInstanceOptions) {
    const payload: Record<string, unknown> = {
      instanceName: options.instanceName,
      qrcode: options.qrcode ?? true,
      integration: options.integration ?? 'WHATSAPP-BAILEYS',
    };

    if (options.webhook) {
      payload.webhook = {
        url: options.webhook.url,
        byEvents: options.webhook.byEvents ?? false,
        base64: options.webhook.base64 ?? true,
        headers: options.webhook.headers,
        events: options.webhook.events ?? [
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
      };
    }

    return this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async fetchInstances() {
    return this.request<any[]>('/instance/fetchInstances', {
      method: 'GET',
    });
  }

  async connectInstance(instanceName: string, apiKey?: string) {
    return this.request(
      `/instance/connect/${instanceName}`,
      { method: 'GET' },
      apiKey
    );
  }

  async getConnectionState(instanceName: string, apiKey?: string) {
    return this.request<{ instance: string; state: string }>(
      `/instance/connectionState/${instanceName}`,
      { method: 'GET' },
      apiKey
    );
  }

  async restartInstance(instanceName: string, apiKey?: string) {
    return this.request(
      `/instance/restart/${instanceName}`,
      { method: 'POST' },
      apiKey
    );
  }

  async logoutInstance(instanceName: string, apiKey?: string) {
    return this.request(
      `/instance/logout/${instanceName}`,
      { method: 'DELETE' },
      apiKey
    );
  }

  async deleteInstance(instanceName: string) {
    return this.request(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
  }

  // Messages
  async sendText(instanceName: string, options: SendTextOptions, apiKey?: string) {
    return this.request(
      `/message/sendText/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      apiKey
    );
  }

  async sendMedia(instanceName: string, options: SendMediaOptions, apiKey?: string) {
    return this.request(
      `/message/sendMedia/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      apiKey
    );
  }

  async sendAudio(
    instanceName: string,
    options: { number: string; audio: string },
    apiKey?: string
  ) {
    return this.request(
      `/message/sendWhatsAppAudio/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      apiKey
    );
  }

  async sendReaction(
    instanceName: string,
    options: {
      key: { remoteJid: string; fromMe: boolean; id: string };
      reaction: string;
    },
    apiKey?: string
  ) {
    return this.request(
      `/message/sendReaction/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      apiKey
    );
  }

  // Chat
  async findContacts(instanceName: string, where?: { id?: string }, apiKey?: string) {
    return this.request(
      `/chat/findContacts/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ where: where || {} }),
      },
      apiKey
    );
  }

  async findMessages(
    instanceName: string,
    options: {
      where: { key: { remoteJid: string } };
      page?: number;
      offset?: number;
    },
    apiKey?: string
  ) {
    return this.request(
      `/chat/findMessages/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      apiKey
    );
  }

  async findChats(instanceName: string, apiKey?: string) {
    return this.request(
      `/chat/findChats/${instanceName}`,
      { method: 'POST' },
      apiKey
    );
  }

  async markMessageAsRead(
    instanceName: string,
    messages: Array<{ remoteJid: string; fromMe: boolean; id: string }>,
    apiKey?: string
  ) {
    return this.request(
      `/chat/markMessageAsRead/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ readMessages: messages }),
      },
      apiKey
    );
  }

  async fetchProfilePicture(instanceName: string, number: string, apiKey?: string) {
    return this.request(
      `/chat/fetchProfilePictureUrl/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ number }),
      },
      apiKey
    );
  }

  async sendPresence(
    instanceName: string,
    options: { number: string; delay: number; presence: string },
    apiKey?: string
  ) {
    return this.request(
      `/chat/sendPresence/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      },
      apiKey
    );
  }

  async getBase64FromMediaMessage(
    instanceName: string,
    messageId: string,
    apiKey?: string
  ): Promise<{ base64: string; mimetype: string }> {
    return this.request(
      `/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          message: { key: { id: messageId } },
          convertToMp4: false,
        }),
      },
      apiKey
    );
  }

  // Webhook configuration
  async setWebhook(
    instanceName: string,
    options: {
      url: string;
      events: string[];
      byEvents?: boolean;
      base64?: boolean;
    },
    apiKey?: string
  ) {
    return this.request(
      `/webhook/set/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          webhook: {
            enabled: true,
            ...options,
          },
        }),
      },
      apiKey
    );
  }
}

export const evolutionApi = new EvolutionApiService();
