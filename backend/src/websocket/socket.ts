import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../services/prisma.service.js';

let io: Server;

interface JwtPayload {
  userId: string;
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.data.user.name} (${socket.id})`);

    // Join conversation room
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`${socket.data.user.name} joined conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`${socket.data.user.name} left conversation:${conversationId}`);
    });

    // Typing indicator
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        user: socket.data.user,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        user: socket.data.user,
      });
    });

    // Presence
    socket.on('presence:online', () => {
      socket.broadcast.emit('presence:update', {
        userId: socket.data.user.id,
        status: 'online',
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.user.name} (${socket.id})`);
      socket.broadcast.emit('presence:update', {
        userId: socket.data.user.id,
        status: 'offline',
      });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}
