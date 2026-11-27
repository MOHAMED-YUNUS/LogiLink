import { sendWhatsAppMessage } from './whatsapp-service.js';
import { getOrCreateConversation } from '../services/chat-service.js';

// Conversation state tracking
const conversationStates = new Map();

export async function processIncomingMessage(phoneNumber, senderName, messageText) {
  try {
    console.log(`📱 Incoming message from ${phoneNumber}: "${messageText}"`);

    // Get or create conversation
    const conversation = await getOrCreateConversation(phoneNumber, senderName);

    // Get conversation state
    let state = conversationStates.get(conversation.id) || {
      conversationId: conversation.id,
      userId: phoneNumber,
      userType: conversation.user_type,
      collectingInfo: null,
      collectedData: {},
    };

    console.log(`🎯 Current user type: ${state.userType || 'unknown'}`);

    // Handle user type identification (first message)
    if (!state.userType) {
      console.log(`🔍 Starting user type identification...`);
      await handleUserTypeIdentification(state, phoneNumber, messageText);
      conversationStates.set(conversation.id, state);
      return;
    }

    // Send a simple AI-powered response
    console.log(`💬 Sending AI response...`);
    const response = `Thank you for your message: "${messageText}"\n\nI'm LogiLink, your logistics assistant. I'm here to help match shippers with transport vendors. How can I assist you today?`;
    await sendWhatsAppMessage(phoneNumber, response);

    conversationStates.set(conversation.id, state);
  } catch (error) {
    console.error('Error processing message:', error.message);
  }
}

async function handleUserTypeIdentification(state, phoneNumber, messageText) {
  const lowerMessage = messageText.toLowerCase();

  console.log(`🔍 Analyzing message for user type: "${lowerMessage}"`);

  if (lowerMessage.includes('seller') || lowerMessage.includes('ship')) {
    state.userType = 'seller';
    const response = `✓ Welcome Seller!\n\nI can help you find transport vendors for your shipments.\n\nWhat goods do you need to ship?`;
    await sendWhatsAppMessage(phoneNumber, response);
    console.log(`✓ Identified as SELLER`);
  } else if (lowerMessage.includes('vendor') || lowerMessage.includes('transport')) {
    state.userType = 'vendor';
    const response = `✓ Welcome Vendor!\n\nI can help you find shipments that match your services.\n\nWhat type of vehicles do you operate?`;
    await sendWhatsAppMessage(phoneNumber, response);
    console.log(`✓ Identified as VENDOR`);
  } else {
    // User hasn't identified yet - send welcome message
    const response = `👋 Welcome to LogiLink!\n\nI'm here to help coordinate logistics between shippers and transport vendors.\n\nAre you a:\n• **Seller** (need to ship goods)\n• **Vendor** (provide transportation)\n\nPlease reply with "seller" or "vendor"`;
    await sendWhatsAppMessage(phoneNumber, response);
    console.log(`⏳ Waiting for user to identify as seller or vendor`);
  }
}
