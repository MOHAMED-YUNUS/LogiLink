# LogiLink – WhatsApp Logistics Coordination Chatbot

A WhatsApp-based AI chatbot that connects sellers who need to transport goods with transport vendors who provide vehicles and delivery services. All interactions happen directly on WhatsApp.

## Overview

LogiLink is a **WhatsApp-only** logistics coordination bot. Users message a WhatsApp Business number and:

- **Sellers** submit shipment requests with pickup/delivery locations, goods details, and vehicle requirements
- **Transport Vendors** register their vehicles and submit quotations
- **Coordinators** can review matches and confirm bookings
- Everyone gets real-time updates via WhatsApp

There is no website, no admin dashboard, and no separate interface. Everything happens on WhatsApp.

## Features

- 🤖 **AI-Powered**: Understands natural language using local Ollama or OpenAI
- 💬 **WhatsApp Integration**: Direct Meta Cloud API or Twilio integration
- 📦 **Seller Workflow**: Easy shipment request creation
- 🚛 **Vendor Workflow**: Vehicle registration and quotations
- 🧮 **Smart Matching**: Automatic vendor-shipment matching
- 💾 **SQLite Database**: Stores all conversations and transactions
- 🔄 **Stateful Conversations**: Maintains context throughout interactions
- 🛡️ **Secure**: API credentials in environment variables only

## Project Structure

```
Logistic Chatbot/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express server entry point
│   │   ├── db/
│   │   │   ├── schema.js          # Database schema
│   │   │   ├── connection.js      # Database connection utilities
│   │   │   ├── init.js            # Database initialization
│   │   │   ├── seed.js            # Sample data seeding
│   │   │   └── knowledge-base.js  # FAQ and business information
│   │   ├── services/
│   │   │   ├── ai-service.js      # AI integration (Ollama/OpenAI)
│   │   │   ├── chat-service.js    # Conversation management
│   │   │   ├── whatsapp-service.js# WhatsApp API integration
│   │   │   ├── message-handler.js # Message processing logic
│   │   │   ├── shipment-service.js# Shipment management
│   │   │   ├── vendor-service.js  # Vendor management
│   │   │   └── seller-service.js  # Seller management
│   │   └── routes/
│   │       └── whatsapp.js        # WhatsApp webhook routes
│   ├── package.json
│   └── data/                      # SQLite database (created on first run)
│
├── .env.example                   # Environment variable template
├── README.md                      # This file
└── SETUP_GUIDE.md                 # Detailed setup instructions

```

## Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Ollama** (for local AI - recommended and free)
- **WhatsApp Business Account** (free, through Meta)
- **ngrok** (for local testing with WhatsApp webhooks)
- Windows or Linux/Mac for development

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd "c:\Logistic Chatbot\backend"
npm install
```

### Step 2: Setup Ollama (Recommended AI)

Ollama provides free local AI without API keys.

**Windows Installation:**

1. Download from https://ollama.ai
2. Install and run
3. Open PowerShell and download the model:
   ```bash
   ollama pull qwen2.5
   ```
4. Start Ollama service:
   ```bash
   ollama serve
   ```

Keep Ollama running while the bot operates.

**Alternative: Use OpenAI**

Skip Ollama and add your OpenAI key to `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

Edit `.env` to configure WhatsApp:

```env
PORT=5000
NODE_ENV=development

# AI Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5

# WhatsApp Configuration
WHATSAPP_API_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_API_TOKEN=your-api-token-here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Database
DATABASE_PATH=./data/logilink.db
```

### Step 4: Set Up WhatsApp Integration

#### Option A: Meta Cloud API (Recommended)

1. **Create Meta Business Account**
   - Go to https://business.facebook.com
   - Create or log in to business account

2. **Create WhatsApp Business App**
   - Go to https://developers.facebook.com
   - Create a new app (category: Business)
   - Add WhatsApp product

3. **Get API Credentials**
   - Phone Number ID
   - Business Account ID
   - API Token (long-lived access token)
   - Webhook Verify Token (you create this)

4. **For Testing: Use Meta's Test Number**
   - Meta provides a test WhatsApp number
   - You can send/receive test messages without verification

5. **Configure `.env`**
   ```env
   WHATSAPP_API_PROVIDER=meta
   WHATSAPP_PHONE_NUMBER_ID=123456789
   WHATSAPP_BUSINESS_ACCOUNT_ID=123456789
   WHATSAPP_API_TOKEN=EAABsBauK...
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=mysecrettoken
   ```

#### Option B: Twilio (Alternative)

1. Create account at https://www.twilio.com
2. Enable WhatsApp Sandbox
3. Configure `.env`:
   ```env
   WHATSAPP_API_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
   ```

### Step 5: Expose Server to Internet (for Webhook)

WhatsApp webhooks require internet-accessible URL. Use **ngrok**:

```bash
# Install ngrok from https://ngrok.com
ngrok http 5000
```

This provides URL like: `https://abc123def456.ngrok.io`

### Step 6: Configure Webhook URL in Meta

1. Go to Meta App Dashboard → WhatsApp → Configuration
2. Set Webhook URL: `https://your-ngrok-url/whatsapp/webhook`
3. Set Verify Token: `your-webhook-verify-token` (matches `.env`)
4. Subscribe to: `messages` and `message_status`

### Step 7: Start the Bot

**Terminal 1: Start Ollama** (if using Ollama)

```bash
ollama serve
```

**Terminal 2: Start Backend**

```bash
cd "c:\Logistic Chatbot\backend"
npm run dev
```

Expected output:

```
✓ Server running on http://localhost:5000

WhatsApp Webhook Endpoints:
  - GET  /whatsapp/webhook (verification)
  - POST /whatsapp/webhook (message receiver)
  - GET  /whatsapp/health (status check)

To test locally, use ngrok: ngrok http 5000
Then configure webhook URL in Meta: https://your-ngrok-url.ngrok.io/whatsapp/webhook
```

## Testing

### Test with WhatsApp Business Account Test Number

1. Add your personal WhatsApp number as a tester in Meta App Dashboard
2. Message the test WhatsApp number
3. Bot responds with conversation flow

### Test Seller Workflow

Message the bot:

```
Hello
> Bot: I'm LogiLink... Are you a Seller or Vendor?

I'm a seller
> Bot: What is your name or business name?

Kumar Textiles
> Bot: What is your pickup location?

Chennai
> Bot: Where do you want to deliver?

Bangalore
> ...continues collecting information...
```

### Test Vendor Workflow

Message the bot:

```
Hi
> Bot: Are you a Seller or Vendor?

Vendor
> Bot: What is your company name?

Arjun Trucks
> ...continues collecting information...
```

## Database Schema

Automatically created in `backend/data/logilink.db`:

- **users** – Phone numbers, names, user types
- **sellers** – Seller profiles
- **vendors** – Vendor profiles and vehicles
- **shipments** – Shipment requests
- **quotations** – Vendor quotations
- **conversations** – Chat conversations
- **messages** – Message history
- **knowledge_base** – FAQ entries
- **shipment_activities** – Activity logs

## Configuration Files

### .env Variables

```env
# Server
PORT=5000
NODE_ENV=development

# AI
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5

# WhatsApp (Meta)
WHATSAPP_API_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_API_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...

# Database
DATABASE_PATH=./data/logilink.db

# Chatbot
CHATBOT_NAME=LogiLink
CHATBOT_TIMEZONE=Asia/Kolkata
LOG_LEVEL=debug
```

## Workflow Diagrams

### Seller Workflow

```
User: "Hello"
   ↓
Bot: "Are you a Seller or Vendor?"
   ↓
User: "Seller"
   ↓
Bot: Collects → Name → Pickup → Delivery → Goods → Weight → Date → Vehicle
   ↓
Bot: Creates Shipment, Assigns Reference Number
   ↓
Bot: Finds Matching Vendors
   ↓
Bot: Notifies Vendor about shipment
   ↓
Bot: Collects Quotations
   ↓
Bot: Notifies Seller about quotations
   ↓
Admin: Accepts/Rejects Quotation
   ↓
Bot: Notifies both parties about booking status
```

### Vendor Workflow

```
User: "Hi"
   ↓
Bot: "Are you a Seller or Vendor?"
   ↓
User: "Vendor"
   ↓
Bot: Collects → Company → Phone → Vehicle → Capacity → Routes → Availability → Rate
   ↓
Bot: Saves Vendor Profile
   ↓
Bot: Notifies when matching shipments available
   ↓
Vendor: Submits Quotation
   ↓
Bot: Notifies Admin + Seller
   ↓
Admin: Accepts Quotation
   ↓
Bot: Notifies Vendor about booking
```

## API Endpoints

### WhatsApp Webhook

- **GET /whatsapp/webhook** – Webhook verification
- **POST /whatsapp/webhook** – Receive incoming messages
- **GET /whatsapp/health** – Bot status check

## Troubleshooting

### "WhatsApp API token not configured"

**Solution**: Add `WHATSAPP_API_TOKEN` to `.env`

### "Model 'qwen2.5' not found"

**Solution**: Download model

```bash
ollama pull qwen2.5
```

### "Cannot connect to Ollama"

**Solution**: Ensure Ollama is running

```bash
ollama serve
```

### Webhook not receiving messages

**Check:**
1. ngrok URL in Meta Dashboard correct
2. Verify Token matches `.env`
3. Phone number ID is correct
4. API Token is valid
5. Server is running

### "Invalid verification token"

Webhook verification failed:

- Check `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`
- Ensure it matches token in Meta Dashboard
- Both must be identical

## Deployment

### Production Deployment

1. **Use Real WhatsApp Business Account Number**
   - Apply for verification at https://www.facebook.com/business/resources/whatsapp-business-api
   - Verify your phone number

2. **Deploy Backend**
   - Use cloud hosting (AWS, Heroku, DigitalOcean, etc.)
   - Set environment variables on host
   - Use production AI provider (OpenAI or external Ollama)

3. **Configure Webhook URL**
   - Point to production server URL
   - Use HTTPS (required by Meta)

4. **Enable SSL/TLS**
   - Use HTTPS with valid certificate
   - Meta requires secure webhooks

5. **Database**
   - Use external database (PostgreSQL, MySQL)
   - Or keep SQLite with proper backups

### Production Checklist

- [ ] Real WhatsApp Business number verified
- [ ] Production AI provider configured
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] HTTPS/SSL enabled
- [ ] Webhook URL in production
- [ ] Error logging enabled
- [ ] Rate limiting configured

## Support & Help

**Common Issues:**

1. **Bot not responding**: Check if backend is running (`npm run dev`)
2. **WhatsApp not receiving**: Verify webhook URL and token
3. **AI not working**: Ensure Ollama is running (`ollama serve`)
4. **Database errors**: Delete `backend/data/logilink.db` and restart

**Documentation:**

- Meta WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- Ollama: https://ollama.ai
- OpenAI API: https://platform.openai.com

## License

This project is provided for demonstration and production use.

---

**LogiLink v1.0.0** – The WhatsApp Logistics Coordinator

