import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { initSocket } from './websocket/socket.js';
import { prisma } from './services/prisma.service.js';
import { evolutionApi } from './services/evolution-api.service.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', routes);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(parseInt(env.PORT), () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  configureWebhooks().catch((err) => {
    console.error('Failed to configure webhooks on startup:', err);
  });
});

async function configureWebhooks() {
  const webhookUrl = env.WEBHOOK_URL || `${env.SERVER_URL}/api/webhook`;
  const instances = await prisma.instance.findMany({ select: { id: true, name: true, apiKey: true } });

  for (const instance of instances) {
    try {
      await evolutionApi.setWebhook(instance.name, {
        url: webhookUrl,
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
        byEvents: false,
        base64: true,
      }, instance.apiKey || undefined);

      console.log(`Webhook configured for instance ${instance.name}`);
    } catch (error) {
      console.error(`Failed to configure webhook for instance ${instance.name}:`, error);
    }
  }
}

export default app;
