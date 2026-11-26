import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db/connection.js';
import { getAIResponse } from './ai-service.js';

export async function getOrCreateConversation(phoneNumber, userName = null) {
  try {
    // Find or create user
    let user = await dbGet(
      'SELECT * FROM users WHERE phone_number = ?',
      [phoneNumber]
    );

    if (!user) {
      const userId = uuidv4();
      await dbRun(
        'INSERT INTO users (id, phone_number, name, user_type) VALUES (?, ?, ?, ?)',
        [userId, phoneNumber, userName || `User ${phoneNumber}`, 'unknown']
      );
      user = { id: userId, phone_number: phoneNumber, name: userName || `User ${phoneNumber}`, user_type: 'unknown' };
    }

    // Find or create conversation
    let conversation = await dbGet(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id]
    );

    if (!conversation) {
      const conversationId = uuidv4();
      await dbRun(
        'INSERT INTO conversations (id, user_id, phone_number, user_type) VALUES (?, ?, ?, ?)',
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
    const messageId = uuidv4();
    await dbRun(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, message_text)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, conversationId, senderType, senderId, messageText]
    );

    // Update conversation timestamp
    await dbRun(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    return messageId;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    throw error;
  }
}

export async function getConversationHistory(conversationId, limit = 20) {
  try {
    const messages = await dbAll(
      `SELECT * FROM messages WHERE conversation_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [conversationId, limit]
    );
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    throw error;
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
