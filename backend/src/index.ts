import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { initSocket } from './websocket/socket.js';

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
});

export default app;
