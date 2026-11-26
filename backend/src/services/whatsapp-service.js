import axios from 'axios';

const WHATSAPP_API_PROVIDER = process.env.WHATSAPP_API_PROVIDER || 'meta';

export async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (WHATSAPP_API_PROVIDER === 'gupshup') {
      return await sendGupshupMessage(phoneNumber, message);
    } else if (WHATSAPP_API_PROVIDER === 'meta') {
      return await sendMetaWhatsAppMessage(phoneNumber, message);
    } else if (WHATSAPP_API_PROVIDER === 'twilio') {
      return await sendTwilioWhatsAppMessage(phoneNumber, message);
    } else {
      throw new Error(`Unknown WhatsApp provider: ${WHATSAPP_API_PROVIDER}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    throw error;
  }
}

async function sendGupshupMessage(phoneNumber, message) {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const appId = process.env.GUPSHUP_APP_ID;

  if (!apiKey || !appId) {
    throw new Error('Gupshup configuration incomplete: API_KEY or APP_ID missing');
  }

  // Normalize phone number (remove special characters, keep only digits)
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

  const url = `https://api.gupshup.io/wa/api/v1/msg`;

  const payload = {
    to: cleanPhoneNumber,
    type: 'text',
    text: message,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `apiKey ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams(payload).toString(),
    });

    console.log(`✓ WhatsApp message sent to ${phoneNumber} via Gupshup`);
    return response.data;
  } catch (error) {
    console.error('Gupshup API error:', error.response?.data || error.message);
    throw new Error(
      `Failed to send WhatsApp message: ${error.response?.data?.message || error.message}`
    );
  }
}

async function sendMetaWhatsAppMessage(phoneNumber, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp configuration incomplete: PHONE_NUMBER_ID or API_TOKEN missing');
  }

  // Normalize phone number (remove special characters, keep only digits)
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

  const url = `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhoneNumber,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✓ WhatsApp message sent to ${phoneNumber}`);
    return response.data;
  } catch (error) {
    console.error('Meta WhatsApp API error:', error.response?.data || error.message);
    throw new Error(
      `Failed to send WhatsApp message: ${error.response?.data?.error?.message || error.message}`
    );
  }
}

async function sendTwilioWhatsAppMessage(phoneNumber, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio configuration incomplete');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  try {
    const response = await axios.post(
      url,
      {
        From: fromNumber,
        To: `whatsapp:${phoneNumber}`,
        Body: message,
      },
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
      }
    );

    console.log(`✓ WhatsApp message sent to ${phoneNumber} via Twilio`);
    return response.data;
  } catch (error) {
    console.error('Twilio API error:', error.response?.data || error.message);
    throw new Error(
      `Failed to send WhatsApp message: ${error.response?.data?.message || error.message}`
    );
  }
}

export function validateWebhook(token) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.warn('⚠ WHATSAPP_WEBHOOK_VERIFY_TOKEN not configured');
    return false;
  }

  return token === verifyToken;
}

export function extractMessageData(body) {
  try {
    // Handle Meta webhook format
    if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const contact = body.entry[0].changes[0].value.contacts[0];

      return {
        messageId: message.id,
        phoneNumber: contact.wa_id,
        senderName: contact.profile?.name || `User ${contact.wa_id}`,
        messageText: message.text?.body || '',
        timestamp: message.timestamp,
        messageType: message.type,
      };
    }

    throw new Error('Unsupported webhook format');
  } catch (error) {
    console.error('Error extracting message data:', error);
    throw error;
  }
}

export async function sendTemplateMessage(phoneNumber, templateName, parameters = []) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp configuration incomplete');
  }

  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  const url = `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: cleanPhoneNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'en',
      },
      parameters: {
        body: {
          parameters: parameters.map(p => ({ text: p })),
        },
      },
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✓ Template message sent to ${phoneNumber}`);
    return response.data;
  } catch (error) {
    console.error('Template message error:', error.response?.data || error.message);
    throw error;
  }
}
