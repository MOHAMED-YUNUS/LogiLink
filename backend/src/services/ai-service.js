import { Ollama } from 'ollama';
import { OpenAI } from 'openai';
import { dbGet, dbAll } from '../db/connection.js';
import { BUSINESS_INFO } from '../db/knowledge-base.js';

const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';

let ollama = null;
let openai = null;

function getOllama() {
  if (!ollama) {
    ollama = new Ollama({
      host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
  }
  return ollama;
}

function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function getAIResponse(conversationId, userMessage, conversationHistory = []) {
  try {
    if (AI_PROVIDER === 'openai') {
      return await getOpenAIResponse(userMessage, conversationHistory);
    } else {
      return await getOllamaResponse(userMessage, conversationHistory);
    }
  } catch (error) {
    console.error('AI Service Error:', error.message);
    throw new Error(`AI service temporarily unavailable: ${error.message}`);
  }
}

async function getOllamaResponse(userMessage, conversationHistory) {
  const ollama = getOllama();
  const model = process.env.OLLAMA_MODEL || 'qwen2.5';

  // Build system prompt with knowledge base
  const systemPrompt = buildSystemPrompt();

  // Format conversation history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.message_text
    })),
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await ollama.chat({
      model,
      messages,
      stream: false,
    });

    return response.message.content;
  } catch (error) {
    // Check if model is not installed
    if (error.message.includes('model') || error.message.includes('not found')) {
      throw new Error(
        `Model '${model}' not found. Please install it using: ollama pull ${model}`
      );
    }
    throw error;
  }
}

async function getOpenAIResponse(userMessage, conversationHistory) {
  const openai = getOpenAI();
  const systemPrompt = buildSystemPrompt();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.message_text
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0].message.content;
}

function buildSystemPrompt() {
  const faqContext = `
You are LogiLink, an AI-powered logistics coordination chatbot assistant. Your role is to:
1. Identify if the user is a Seller or Transport Vendor
2. Collect required information from them
3. Provide helpful, accurate responses based on the knowledge base
4. Maintain conversation context

BUSINESS INFORMATION:
- Name: ${BUSINESS_INFO.name}
- Description: ${BUSINESS_INFO.description}
- Communication Style: ${BUSINESS_INFO.communicationStyle}

KEY RULES:
- Always be professional, friendly, and concise
- Ask one question at a time
- If a user is unclear about their role, ask clarifying questions
- Use the conversation history to remember context
- For sellers: collect pickup location, delivery location, goods description, quantity, weight, pickup date, vehicle type
- For vendors: collect company name, vehicle type, load capacity, operating routes, availability, quotation
- Never invent pricing, availability, or shipment tracking information
- If you don't have specific information, escalate to a human coordinator
- Always maintain a helpful and solution-oriented tone

IMPORTANT ESCALATION TOPICS (require human handoff):
- Payment disputes or additional charges
- Damaged goods
- Accidents or emergencies
- Serious vendor-seller conflicts
- OTP or sensitive information requests

When unsure, always offer: "Would you like me to connect you with a human coordinator who can help?"
`;

  return faqContext;
}

export async function checkAIHealth() {
  try {
    if (AI_PROVIDER === 'openai') {
      // OpenAI doesn't have a health check endpoint, so we just check if key exists
      if (!process.env.OPENAI_API_KEY) {
        return { healthy: false, provider: 'openai', error: 'API key not configured' };
      }
      return { healthy: true, provider: 'openai', model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo' };
    } else {
      // Check Ollama health
      const ollama = getOllama();
      const model = process.env.OLLAMA_MODEL || 'qwen2.5';

      try {
        // Try to get model info
        await ollama.show({ model });
        return { healthy: true, provider: 'ollama', model };
      } catch (error) {
        return {
          healthy: false,
          provider: 'ollama',
          error: `Model '${model}' not installed. Run: ollama pull ${model}`,
          instructions: `To use LogiLink, please:
1. Install Ollama from https://ollama.ai
2. Run: ollama serve (in a separate terminal)
3. Download model: ollama pull ${model}
4. Try again`
        };
      }
    }
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export async function listAvailableModels() {
  try {
    if (AI_PROVIDER === 'openai') {
      return ['gpt-3.5-turbo', 'gpt-4'];
    } else {
      const ollama = getOllama();
      const response = await ollama.list();
      return response.models?.map(m => m.name) || [];
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
    return [];
  }
}
