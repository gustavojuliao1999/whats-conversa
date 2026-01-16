import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'password'>;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: any;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

export interface MessageUpsertData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
      contextInfo?: {
        quotedMessage?: any;
        stanzaId?: string;
      };
    };
    imageMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
      fileSha256?: string;
      fileLength?: string;
      height?: number;
      width?: number;
    };
    videoMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
      fileSha256?: string;
      fileLength?: string;
      seconds?: number;
    };
    audioMessage?: {
      url: string;
      mimetype: string;
      fileSha256?: string;
      fileLength?: string;
      seconds?: number;
      ptt?: boolean;
    };
    documentMessage?: {
      url: string;
      mimetype: string;
      title?: string;
      fileSha256?: string;
      fileLength?: string;
      fileName?: string;
    };
    stickerMessage?: {
      url: string;
      mimetype: string;
      fileSha256?: string;
      fileLength?: string;
      height?: number;
      width?: number;
    };
    locationMessage?: {
      degreesLatitude: number;
      degreesLongitude: number;
      name?: string;
      address?: string;
    };
    contactMessage?: {
      displayName: string;
      vcard: string;
    };
    reactionMessage?: {
      key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
      };
      text: string;
    };
  };
  messageType?: string;
  messageTimestamp?: number;
  owner?: string;
  source?: string;
}

export interface ConnectionUpdateData {
  instance: string;
  state: 'open' | 'close' | 'connecting';
  statusReason?: number;
}

export interface ContactsUpsertData {
  id: string;
  pushName?: string;
  profilePictureUrl?: string;
  owner?: string;
}

export interface QrCodeUpdateData {
  instance: string;
  qrcode?: {
    base64: string;
    code: string;
  };
}
