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

// Webhook message receiver (POST request from Meta or Gupshup)
router.post('/webhook', async (req, res) => {
  try {
    // Log incoming webhook
    console.log('📨 Incoming webhook:', JSON.stringify(req.body, null, 2));

    const provider = process.env.WHATSAPP_API_PROVIDER || 'meta';
    console.log(`Provider: ${provider}`);

    // Handle Gupshup format
    if (provider === 'gupshup' || req.body.gs_app_id) {
      console.log('🔄 Processing Gupshup webhook...');
      
      // Gupshup sends messages differently
      if (req.body.message) {
        try {
          const message = req.body.message;
          console.log('✓ Gupshup message received:', message);

          // Extract Gupshup message data
          const phoneNumber = message.mobile || message.sender;
          const messageText = message.text || message.payload?.text || '';
          const senderName = message.name || `User ${phoneNumber}`;

          if (messageText) {
            console.log(`📩 Message from ${senderName} (${phoneNumber}): ${messageText}`);

            // Process message asynchronously
            processIncomingMessage(phoneNumber, senderName, messageText)
              .catch(error => console.error('Error processing message:', error));
          }

          res.status(200).json({ success: true });
        } catch (gupshupError) {
          console.error('Error processing Gupshup message:', gupshupError);
          res.status(200).json({ success: true }); // Always 200 for webhook
        }
      } else if (req.body.type === 'message-status-update') {
        // Gupshup status update
        console.log(`📌 Gupshup status update: ${req.body.status}`);
        res.status(200).json({ success: true });
      } else {
        console.log('Other Gupshup event:', req.body);
        res.status(200).json({ success: true });
      }
    }
    // Handle Meta format (original)
    else if (req.body.entry?.[0]?.changes?.[0]?.value?.messages) {
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
        res.status(200).json({ success: true }); // Always 200 for webhook
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
    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: process.env.WHATSAPP_API_PROVIDER || 'gupshup',
    configured: !!process.env.GUPSHUP_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint to verify webhook is reachable
router.get('/test', (req, res) => {
  console.log('✓ WhatsApp webhook test endpoint called');
  res.json({ 
    success: true, 
    message: 'Webhook is reachable',
    timestamp: new Date().toISOString(),
  });
});

export default router;
