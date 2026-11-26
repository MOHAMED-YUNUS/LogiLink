# LogiLink – 5-Minute Quick Start

## Installation

```bash
cd "c:\Logistic Chatbot\backend"
npm install
```

## Configuration

```bash
copy .env.example .env
# Edit .env with your WhatsApp credentials
```

## Run (3 Terminals)

### Terminal 1: Ollama (Free Local AI)

```bash
ollama serve
```

**Keep running.** First time: `ollama pull qwen2.5`

### Terminal 2: Backend Server

```bash
cd "c:\Logistic Chatbot\backend"
npm run dev
```

### Terminal 3: ngrok (For Testing)

```bash
ngrok http 5000
```

**Copy HTTPS URL** (e.g., `https://abc123...ngrok.io`)

## Configure WhatsApp Webhook

1. Go to Meta App Dashboard
2. WhatsApp → Configuration
3. Callback URL: `https://your-ngrok-url/whatsapp/webhook`
4. Verify Token: `mysecrettoken123`

## Test

Message your WhatsApp test number:

```
Hello
```

**Expected Response:**

```
I'm LogiLink, a logistics coordination chatbot. 
Are you a **Seller** or **Vendor**?
```

---

## Environment Variables (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# AI (Free - Local)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5

# AI (Paid - OpenAI)
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...

# WhatsApp (Meta API)
WHATSAPP_API_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=your-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-id
WHATSAPP_API_TOKEN=EAABsBauK...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=mysecrettoken123

# Database
DATABASE_PATH=./data/logilink.db

# Chatbot
CHATBOT_NAME=LogiLink
CHATBOT_TIMEZONE=Asia/Kolkata
LOG_LEVEL=debug
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Ollama not found | Download from https://ollama.ai |
| Model not found | Run `ollama pull qwen2.5` |
| Backend won't start | Check port 5000 is free, check `.env` |
| Bot not responding | Check all 3 terminals running, check API token |
| Webhook not connecting | Check ngrok running, URL in Meta correct, Verify Token matches |

---

## Workflow

### Seller Sends Message

```
I need transport from Delhi to Mumbai
↓
Bot: What is your name?
↓
Ramesh
↓
Bot: What goods?
↓
Textiles, 5 tonnes
↓
Bot: Vehicle needed?
↓
14-ton truck
↓
Bot: ✓ Shipment created: LL-123456
```

### Vendor Sends Message

```
I have trucks available
↓
Bot: Are you a seller or vendor?
↓
Vendor
↓
Bot: Company name?
↓
Fast Transport
↓
Bot: Vehicle type and capacity?
↓
14-ton truck, 5 tonnes
↓
Bot: Routes?
↓
Delhi to Mumbai
↓
Bot: ✓ Registered!
```

---

## Get Help

- **Full Setup Guide**: `SETUP_GUIDE.md`
- **Full Documentation**: `README.md`
- **Issues?**: Check terminal output for errors

---

**Start the bot:** Terminal 1 → Terminal 2 → Terminal 3 → Message WhatsApp number

**LogiLink v1.0.0** - Your WhatsApp Logistics Bot
