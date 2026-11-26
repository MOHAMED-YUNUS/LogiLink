import express from 'express';
import { validateWebhook, extractMessageData } from '../services/whatsapp-service.js';
import { processIncomingMessage } from '../services/message-handler.js';

const router = express.Router();

// Webhook verification (GET request from Meta)
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (!mode || !token) {
      console.warn('⚠ Webhook verification without required parameters');
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Verify token
    if (mode === 'subscribe' && validateWebhook(token)) {
      console.log('✓ Webhook verified');
      res.status(200).send(challenge);
    } else {
      console.warn('✗ Webhook verification failed - invalid token');
      res.status(403).json({ error: 'Invalid verification token' });
    }
  } catch (error) {
    console.error('Error in webhook verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook message receiver (POST request from Meta)
router.post('/webhook', async (req, res) => {
  try {
    // Log incoming webhook
    console.log('📨 Incoming webhook:', JSON.stringify(req.body, null, 2));

    // Check if it's a message event
    if (req.body.entry?.[0]?.changes?.[0]?.value?.messages) {
      try {
        // Extract message data
        const messageData = extractMessageData(req.body);
        console.log('✓ Message extracted:', messageData);

        // Process message asynchronously
        processIncomingMessage(messageData.phoneNumber, messageData.senderName, messageData.messageText)
          .catch(error => console.error('Error processing message:', error));

        // Respond immediately to Meta
        res.status(200).json({ success: true });
      } catch (extractError) {
        console.error('Error extracting message:', extractError);
        res.status(400).json({ error: 'Invalid message format' });
      }
    } else if (req.body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      // Handle message status updates (delivery, read, etc.)
      const status = req.body.entry[0].changes[0].value.statuses[0];
      console.log(`📌 Message status: ${status.status} - ${status.id}`);
      res.status(200).json({ success: true });
    } else {
      // Other webhook events (e.g., account updates)
      console.log('Other webhook event:', req.body.entry?.[0]?.changes?.[0]?.field);
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to acknowledge receipt to Meta
    res.status(200).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: process.env.WHATSAPP_API_PROVIDER || 'meta',
    configured: !!process.env.WHATSAPP_API_TOKEN,
  });
});

export default router;
