import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';

// Auth
import * as authController from '../controllers/auth.controller.js';

// Instance
import * as instanceController from '../controllers/instance.controller.js';

// Conversation
import * as conversationController from '../controllers/conversation.controller.js';

// Message
import * as messageController from '../controllers/message.controller.js';

// Webhook
import * as webhookController from '../controllers/webhook.controller.js';

// User
import * as userController from '../controllers/user.controller.js';

// Team
import * as teamController from '../controllers/team.controller.js';

// Label
import * as labelController from '../controllers/label.controller.js';

const router = Router();

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Auth routes (protected)
router.get('/auth/me', authMiddleware, authController.me);
router.put('/auth/profile', authMiddleware, authController.updateProfile);
router.put('/auth/password', authMiddleware, authController.changePassword);

// Webhook route (from Evolution API)
router.post('/webhook', webhookController.handleWebhook);
router.post('/webhook/:instance', webhookController.handleWebhook);

// Instance routes
router.get('/instances', authMiddleware, instanceController.listInstances);
router.post('/instances', authMiddleware, adminMiddleware, instanceController.createInstance);
router.get('/instances/:id', authMiddleware, instanceController.getInstance);
router.delete('/instances/:id', authMiddleware, adminMiddleware, instanceController.deleteInstance);
router.post('/instances/:id/connect', authMiddleware, instanceController.connectInstance);
router.get('/instances/:id/status', authMiddleware, instanceController.getConnectionState);
router.post('/instances/:id/logout', authMiddleware, adminMiddleware, instanceController.logoutInstance);
router.post('/instances/:id/restart', authMiddleware, adminMiddleware, instanceController.restartInstance);
router.post('/instances/:id/sync', authMiddleware, instanceController.syncConversations);
// Conversation routes
router.get('/conversations', authMiddleware, conversationController.listConversations);
router.get('/conversations/stats', authMiddleware, conversationController.getConversationStats);
router.get('/conversations/:id', authMiddleware, conversationController.getConversation);
router.put('/conversations/:id', authMiddleware, conversationController.updateConversation);
router.post('/conversations/:id/assign', authMiddleware, conversationController.assignConversation);
router.post('/conversations/:id/resolve', authMiddleware, conversationController.resolveConversation);
router.post('/conversations/:id/reopen', authMiddleware, conversationController.reopenConversation);
router.post('/conversations/:id/labels', authMiddleware, conversationController.addLabel);
router.delete('/conversations/:id/labels/:labelId', authMiddleware, conversationController.removeLabel);

// Message routes
router.get('/conversations/:conversationId/messages', authMiddleware, messageController.getMessages);
router.post('/conversations/:conversationId/messages/text', authMiddleware, messageController.sendTextMessage);
router.post('/conversations/:conversationId/messages/media', authMiddleware, messageController.sendMediaMessage);
router.post('/conversations/:conversationId/messages/audio', authMiddleware, messageController.sendAudioMessage);
router.post('/conversations/:conversationId/messages/read', authMiddleware, messageController.markAsRead);
router.post('/conversations/:conversationId/messages/sync', authMiddleware, messageController.syncMessages);
router.post('/conversations/:conversationId/typing', authMiddleware, messageController.sendTyping);
router.get('/messages/:messageId/file', messageController.getMediaFile);

// User routes (admin only for most)
router.get('/users', authMiddleware, userController.listUsers);
router.post('/users', authMiddleware, adminMiddleware, userController.createUser);
router.get('/users/:id', authMiddleware, userController.getUser);
router.put('/users/:id', authMiddleware, adminMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, adminMiddleware, userController.deleteUser);
router.post('/users/:id/reset-password', authMiddleware, adminMiddleware, userController.resetPassword);

// Team routes
router.get('/teams', authMiddleware, teamController.listTeams);
router.post('/teams', authMiddleware, adminMiddleware, teamController.createTeam);
router.get('/teams/:id', authMiddleware, teamController.getTeam);
router.put('/teams/:id', authMiddleware, adminMiddleware, teamController.updateTeam);
router.delete('/teams/:id', authMiddleware, adminMiddleware, teamController.deleteTeam);
router.post('/teams/:id/users', authMiddleware, adminMiddleware, teamController.addUserToTeam);
router.delete('/teams/:id/users/:userId', authMiddleware, adminMiddleware, teamController.removeUserFromTeam);

// Label routes
router.get('/labels', authMiddleware, labelController.listLabels);
router.post('/labels', authMiddleware, adminMiddleware, labelController.createLabel);
router.put('/labels/:id', authMiddleware, adminMiddleware, labelController.updateLabel);
router.delete('/labels/:id', authMiddleware, adminMiddleware, labelController.deleteLabel);

export default router;
