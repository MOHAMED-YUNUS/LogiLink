import { handleUserMessage, getOrCreateConversation, saveMessage, updateConversationUserType } from './chat-service.js';
import { sendWhatsAppMessage } from './whatsapp-service.js';
import { getOrCreateSeller } from './seller-service.js';
import { getOrCreateVendor } from './vendor-service.js';
import { createShipment, findMatchingVendors } from './shipment-service.js';
import { dbGet } from '../db/connection.js';

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

    // Handle user type identification
    if (!state.userType) {
      await handleUserTypeIdentification(state, messageText);
      conversationStates.set(conversation.id, state);
      return;
    }

    // Route to appropriate handler
    if (state.userType === 'seller') {
      await handleSellerMessage(state, messageText);
    } else if (state.userType === 'vendor') {
      await handleVendorMessage(state, messageText);
    }

    conversationStates.set(conversation.id, state);
  } catch (error) {
    console.error('Error processing message:', error);
    // Send error message to user
    try {
      await sendWhatsAppMessage(phoneNumber, `Sorry, I encountered an error: ${error.message}. Please try again.`);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

async function handleUserTypeIdentification(state, messageText) {
  const { conversationId, userId } = state;
  const lowerMessage = messageText.toLowerCase();

  if (lowerMessage.includes('seller') || lowerMessage.includes('transport')) {
    if (lowerMessage.includes('seller')) {
      state.userType = 'seller';
      await updateConversationUserType(conversationId, 'seller');
      const response = `Welcome! I'm here to help you arrange a shipment. Let's collect your shipment details.\n\nWhat is your name or business name?`;
      await sendChatResponse(conversationId, userId, response);
    } else {
      state.userType = 'vendor';
      await updateConversationUserType(conversationId, 'vendor');
      const response = `Welcome! I'm here to connect you with shippers who need transportation.\n\nWhat is your company name?`;
      await sendChatResponse(conversationId, userId, response);
    }
  } else {
    // Unclear response, ask again
    const response = `I'm LogiLink, a logistics coordination chatbot. To help you better, please tell me:\n\nAre you a **Seller** (need to transport goods) or a **Vendor** (provide transportation services)?`;
    await sendChatResponse(conversationId, userId, response);
  }
}

async function handleSellerMessage(state, messageText) {
  const { conversationId, userId, collectedData } = state;

  // State machine for seller information collection
  if (!collectedData.name) {
    collectedData.name = messageText;
    state.collectedData = collectedData;
    const response = `Nice to meet you, ${messageText}! 📦\n\nNow, what is your pickup location? (City or address)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.pickupLocation) {
    collectedData.pickupLocation = messageText;
    const response = `Got it! Pickup from ${messageText}.\n\nWhere do you want to deliver? (Delivery city or address)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.deliveryLocation) {
    collectedData.deliveryLocation = messageText;
    const response = `Perfect! Delivery to ${messageText}.\n\nWhat are you shipping? (Goods description)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.goodsDescription) {
    collectedData.goodsDescription = messageText;
    const response = `Got it! You're shipping "${messageText}".\n\nApproximate weight in tonnes?`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.weight) {
    const weight = parseFloat(messageText);
    if (isNaN(weight)) {
      const response = `Please enter a valid weight in tonnes (e.g., 2, 2.5, 5)`;
      await sendChatResponse(conversationId, userId, response);
      return;
    }
    collectedData.weight = weight;
    const response = `Weight: ${weight} tonnes. ✓\n\nWhat date do you need pickup? (e.g., Tomorrow, 25-Nov, Friday)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.pickupDate) {
    collectedData.pickupDate = messageText;
    const response = `Pickup date set to ${messageText}.\n\nWhat vehicle type do you need? (e.g., 10-ton truck, 14-foot truck, lorry)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.vehicleType) {
    collectedData.vehicleType = messageText;

    // All information collected, create shipment
    try {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
      const seller = await getOrCreateSeller(userId, { businessName: collectedData.name, businessAddress: collectedData.pickupLocation });

      const { shipmentId, referenceNumber } = await createShipment({
        sellerId: seller,
        pickupLocation: collectedData.pickupLocation,
        deliveryLocation: collectedData.deliveryLocation,
        goodsDescription: collectedData.goodsDescription,
        quantity: '1',
        weight: collectedData.weight,
        dimensions: null,
        pickupDate: collectedData.pickupDate,
        pickupTime: null,
        vehicleTypeRequired: collectedData.vehicleType,
        specialRequirements: null,
      });

      // Find matching vendors
      const matchingVendors = await findMatchingVendors({
        pickupLocation: collectedData.pickupLocation,
        deliveryLocation: collectedData.deliveryLocation,
        weight_tonnes: collectedData.weight,
        vehicleTypeRequired: collectedData.vehicleType,
      });

      let response = `✓ Shipment request created!\n\n📋 Reference: ${referenceNumber}\n\n📍 Route: ${collectedData.pickupLocation} → ${collectedData.deliveryLocation}\n📦 Goods: ${collectedData.goodsDescription}\n⚖️ Weight: ${collectedData.weight}t\n🚛 Vehicle: ${collectedData.vehicleType}\n📅 Date: ${collectedData.pickupDate}\n\nI'm looking for suitable vendors...`;

      if (matchingVendors && matchingVendors.length > 0) {
        response += `\n\n✓ Found ${matchingVendors.length} matching vendors!\n\nYou'll receive updates on your WhatsApp when vendors submit quotations.`;
      } else {
        response += `\n\nCurrently no vendors match your requirements, but coordinators will reach out soon.`;
      }

      response += `\n\nYou can reference your shipment anytime: **${referenceNumber}**`;

      await sendChatResponse(conversationId, userId, response);

      // Reset collected data
      state.collectedData = {};
      state.collectingInfo = null;
    } catch (error) {
      console.error('Error creating shipment:', error);
      await sendChatResponse(conversationId, userId, `❌ Error creating shipment: ${error.message}`);
    }
  }
}

async function handleVendorMessage(state, messageText) {
  const { conversationId, userId, collectedData } = state;

  if (!collectedData.companyName) {
    collectedData.companyName = messageText;
    const response = `Welcome, ${messageText}! 🚛\n\nWhat is your phone/contact number?`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.phoneNumber) {
    collectedData.phoneNumber = messageText;
    const response = `Got it! Contact: ${messageText}.\n\nWhat vehicle types do you operate? (e.g., 10-ton truck, 14-foot truck)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.vehicleType) {
    collectedData.vehicleType = messageText;
    const response = `Vehicle: ${messageText}.\n\nWhat's your vehicle's load capacity in tonnes?`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.loadCapacity) {
    const capacity = parseFloat(messageText);
    if (isNaN(capacity)) {
      const response = `Please enter a valid capacity in tonnes (e.g., 4, 5, 8)`;
      await sendChatResponse(conversationId, userId, response);
      return;
    }
    collectedData.loadCapacity = capacity;
    const response = `Capacity: ${capacity} tonnes. ✓\n\nWhat routes do you serve? (e.g., Chennai-Bangalore, Delhi-NCR)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.operatingRoutes) {
    collectedData.operatingRoutes = messageText;
    const response = `Routes: ${messageText}.\n\nWhen is your vehicle available? (e.g., Tomorrow, This week)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.availability) {
    collectedData.availability = messageText;
    const response = `Availability: ${messageText}.\n\nWhat is your quotation rate? (e.g., ₹150 per km or ₹5000 flat)`;
    await sendChatResponse(conversationId, userId, response);
  } else if (!collectedData.quotation) {
    collectedData.quotation = messageText;

    try {
      const vendorId = await getOrCreateVendor(userId, {
        companyName: collectedData.companyName,
        vehicleType: collectedData.vehicleType,
        loadCapacity: collectedData.loadCapacity,
        registrationNumber: null,
        operatingLocations: null,
        operatingRoutes: collectedData.operatingRoutes,
        availability: collectedData.availability,
        quotationPerKm: parseFloat(collectedData.quotation.match(/\d+/)?.[0]) || null,
        baseQuotation: parseFloat(collectedData.quotation.match(/\d+/)?.[0]) || null,
      });

      const response = `✓ Your information has been registered!\n\n🚛 Company: ${collectedData.companyName}\n🚗 Vehicle: ${collectedData.vehicleType} (${collectedData.loadCapacity}t)\n📍 Routes: ${collectedData.operatingRoutes}\n💰 Rate: ${collectedData.quotation}\n\nYou'll receive notifications about matching shipment requests on this WhatsApp number.`;

      await sendChatResponse(conversationId, userId, response);

      // Reset collected data
      state.collectedData = {};
      state.collectingInfo = null;
    } catch (error) {
      console.error('Error registering vendor:', error);
      await sendChatResponse(conversationId, userId, `❌ Error registering: ${error.message}`);
    }
  }
}

async function sendChatResponse(conversationId, userId, responseText) {
  try {
    // Save to database
    await saveMessage(conversationId, 'bot', null, responseText);

    // Get user phone number
    const user = await dbGet('SELECT phone_number FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.error('User not found for ID:', userId);
      return;
    }

    // Send via WhatsApp
    await sendWhatsAppMessage(user.phone_number, responseText);
  } catch (error) {
    console.error('Error sending chat response:', error);
    throw error;
  }
}
