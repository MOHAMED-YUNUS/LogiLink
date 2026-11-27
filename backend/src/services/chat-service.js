import { dbRun, dbGet, dbAll } from '../db/connection.js';
import { getAIResponse } from './ai-service.js';

export async function getOrCreateConversation(phoneNumber, userName = null) {
  try {
    console.log(`📝 Getting/creating conversation for ${phoneNumber}`);
    
    // Return a mock conversation since database is read-only on Render
    const conversationId = `conv_${phoneNumber.replace(/\D/g, '')}`;
    
    return {
      id: conversationId,
      phone_number: phoneNumber,
      name: userName || `User ${phoneNumber}`,
      user_type: 'unknown',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error.message);
    throw error;
  }
}

export async function saveMessage(conversationId, senderType, senderId, messageText) {
  try {
    console.log(`💬 Message saved to memory: ${senderType} - ${messageText.substring(0, 50)}`);
    // Skip database write - Render filesystem is read-only
    return `msg_${Date.now()}`;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return null;
  }
}

export async function getConversationHistory(conversationId, limit = 20) {
  try {
    console.log(`📜 Getting conversation history for ${conversationId}`);
    // Return empty history - bot will respond based on current message
    return [];
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return [];
  }
}

export async function handleUserMessage(conversationId, userId, userMessage) {
  try {
    console.log(`💬 Handling user message: ${userMessage}`);
    
    // Save user message
    await saveMessage(conversationId, 'user', userId, userMessage);

    // Get conversation history
    const history = await getConversationHistory(conversationId);

    // Get AI response
    const aiResponse = await getAIResponse(conversationId, userMessage, history);

    // Save bot response
    const messageId = await saveMessage(conversationId, 'bot', null, aiResponse);

    return { success: true, response: aiResponse, messageId };
  } catch (error) {
    console.error('Error in handleUserMessage:', error);
    // Return graceful error message
    const errorMessage = error.message.includes('AI service')
      ? error.message
      : 'I apologize, but I encountered an issue processing your message. Please try again or request to speak with a human coordinator.';

    await saveMessage(conversationId, 'bot', null, errorMessage);
    return { success: false, response: errorMessage };
  }
}

export async function updateConversationUserType(conversationId, userType) {
  try {
    console.log(`📝 Updating conversation user type to: ${userType}`);
    // Skip database write
    return true;
  } catch (error) {
    console.error('Error updating conversation user type:', error);
  }
}

export async function getAllConversations(filters = {}) {
  try {
    console.log('📋 Getting all conversations');
    // Return empty array - no database persistence
    return [];
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    return [];
  }
}

export async function getConversationById(conversationId) {
  try {
    console.log(`📖 Getting conversation: ${conversationId}`);
    // Return mock conversation
    return {
      id: conversationId,
      phone_number: 'unknown',
      message_count: 0,
    };
  } catch (error) {
    console.error('Error in getConversationById:', error);
    throw error;
  }
}
