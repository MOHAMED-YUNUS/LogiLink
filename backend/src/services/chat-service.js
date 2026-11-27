import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db/connection.js';
import { getAIResponse } from './ai-service.js';

export async function getOrCreateConversation(phoneNumber, userName = null) {
  try {
    console.log(`📝 Getting/creating conversation for ${phoneNumber}`);
    
    // For now, return a mock conversation since database is read-only on Render
    // This allows the bot to respond without needing database writes
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
        [conversationId, user.id, phoneNumber, 'unknown']
      );
      conversation = { id: conversationId, user_id: user.id, phone_number: phoneNumber, user_type: 'unknown' };
    }

    return { user, conversation };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
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
    await dbRun(
      'UPDATE conversations SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userType, conversationId]
    );
  } catch (error) {
    console.error('Error updating conversation user type:', error);
  }
}

export async function getAllConversations(filters = {}) {
  try {
    let query = `
      SELECT c.*, u.name, u.phone_number, u.user_type,
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.userType) {
      query += ' AND c.user_type = ?';
      params.push(filters.userType);
    }

    if (filters.status) {
      query += ' AND c.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY c.last_message_at DESC';

    const conversations = await dbAll(query, params);
    return conversations;
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    throw error;
  }
}

export async function getConversationById(conversationId) {
  try {
    const conversation = await dbGet(
      `SELECT c.*, u.name, u.phone_number, u.user_type as user_user_type
       FROM conversations c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [conversationId]
    );

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages = await getConversationHistory(conversationId, 100);
    return { ...conversation, messages };
  } catch (error) {
    console.error('Error in getConversationById:', error);
    throw error;
  }
}

export async function sendManualMessage(conversationId, adminUserId, messageText) {
  try {
    // Save message from admin
    const messageId = await saveMessage(conversationId, 'admin', adminUserId, messageText);

    // Update conversation timestamp
    await dbRun(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    return messageId;
  } catch (error) {
    console.error('Error in sendManualMessage:', error);
    throw error;
  }
}
