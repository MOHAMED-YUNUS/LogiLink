# LogiLink – Complete Setup Guide

This guide walks you through setting up LogiLink as a WhatsApp-only logistics chatbot.

## Overview

LogiLink is **WhatsApp-only**. Users message a WhatsApp number, and the AI bot:
- Identifies if they're a Seller or Transport Vendor
- Collects information step-by-step
- Stores data in SQLite
- Matches sellers with vendors
- Sends updates via WhatsApp

**No website. No dashboard. Everything is on WhatsApp.**

---

## Part 1: Prerequisites

### Required Software

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Ollama** (Recommended AI - Free)
   - Download: https://ollama.ai
   - Windows installer
   - Or use OpenAI API instead

3. **ngrok** (For webhook testing)
   - Download: https://ngrok.com
   - Or use Cloudflare Tunnel (free alternative)

4. **WhatsApp Business Account**
   - Free: https://business.facebook.com
   - Required for real integration

### Required Accounts

- **Meta/Facebook Business Account** (free)
- **WhatsApp Business API Access** (free for testing)
- **OpenAI Account** (optional, if not using Ollama)

---

## Part 2: Local Setup (Windows PowerShell)

### Step 1: Install Ollama (Free Local AI)

This is recommended because:
- ✅ **Free** – No API costs
- ✅ **Private** – All processing local
- ✅ **Fast** – Runs on your machine
- ✅ **Offline** – Works without internet

**Installation:**

1. Download from https://ollama.ai
2. Run installer
3. Open PowerShell and download the AI model:

```powershell
ollama pull qwen2.5
```

This takes 5-15 minutes depending on internet speed (model is ~4GB).

**Start Ollama:**

```powershell
ollama serve
```

**Keep this terminal open.** The bot won't work without Ollama running.

### Step 2: Configure Backend

```powershell
cd "c:\Logistic Chatbot\backend"
npm install
```

This installs all Node dependencies (may take 2-3 minutes).

### Step 3: Create Environment File

```powershell
copy .env.example .env
```

**Edit `.env`** with your favorite text editor:

```env
PORT=5000
NODE_ENV=development

# Use local Ollama
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5

# WhatsApp (configure later)
WHATSAPP_API_PROVIDER=meta
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=mysecrettoken123

# Database (auto-created)
DATABASE_PATH=./data/logilink.db

CHATBOT_NAME=LogiLink
CHATBOT_TIMEZONE=Asia/Kolkata
LOG_LEVEL=debug
```

### Step 4: Start Backend Server

**New PowerShell terminal** (don't close Ollama):

```powershell
cd "c:\Logistic Chatbot\backend"
npm run dev
```

Expected output:

```
✓ Server running on http://localhost:5000

WhatsApp Webhook Endpoints:
  - GET  /whatsapp/webhook (verification)
  - POST /whatsapp/webhook (message receiver)
```

**Keep this running.**

---

## Part 3: WhatsApp Integration

### Option A: Meta Cloud API (Recommended for Production)

#### Step 1: Create Meta Business Account

1. Go to https://business.facebook.com
2. Sign in or create account
3. Create Business Account

#### Step 2: Create WhatsApp App

1. Go to https://developers.facebook.com
2. Click **Create App**
3. Choose category: **Business**
4. Fill app details
5. Add **WhatsApp** product

#### Step 3: Get API Credentials

In your app dashboard:

1. **Phone Number ID**
   - Go to WhatsApp → API Setup
   - Copy "Phone number ID"

2. **Business Account ID**
   - Go to Settings → Business settings
   - Copy "Business Account ID"

3. **API Token** (Permanent Access Token)
   - Go to Tokens → System User Tokens
   - Create token with these permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_account_access`
   - Copy token (long string starting with `EAA...`)

4. **Webhook Verify Token**
   - Create any secret string (you define it)
   - Use in `.env`: `WHATSAPP_WEBHOOK_VERIFY_TOKEN=mysecrettoken123`

#### Step 4: Use Test Number

For development, Meta provides a test WhatsApp number:

- Use test number for initial testing
- Add your personal WhatsApp as "test user"
- Send test messages without verification

#### Step 5: Configure Webhook (with ngrok for testing)

**Terminal 3: Start ngrok**

```powershell
# Install ngrok first from https://ngrok.com
ngrok http 5000
```

**Copy the HTTPS URL** (e.g., `https://abc123def456.ngrok.io`)

**Configure in Meta App Dashboard:**

1. Go to WhatsApp → Configuration
2. Callback URL: `https://your-ngrok-url/whatsapp/webhook`
3. Verify Token: `mysecrettoken123` (matches `.env`)
4. Subscribe to: `messages`, `message_status`

#### Step 6: Test Webhook Verification

Meta will verify by sending GET request. You should see:

```
✓ Webhook verified
```

#### Step 7: Update `.env`

```env
WHATSAPP_API_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_API_TOKEN=EAABsBauK...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=mysecrettoken123
```

### Option B: Twilio (Alternative)

If you prefer Twilio:

1. Create account: https://www.twilio.com
2. Enable WhatsApp Sandbox
3. Update `.env`:

```env
WHATSAPP_API_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

Twilio will provide test number.

---

## Part 4: Testing

### Test 1: Backend Health Check

```bash
curl http://localhost:5000/health
```

Should return:

```json
{"status":"ok","message":"LogiLink WhatsApp bot is running"}
```

### Test 2: Send Test Message

Message your WhatsApp test number:

```
Hello
```

**Expected bot response:**

```
I'm LogiLink, a logistics coordination chatbot. To help you better, please tell me:

Are you a **Seller** (need to transport goods) or a **Vendor** (provide transportation services)?
```

### Test 3: Complete Seller Flow

```
Hello
> Bot asks for type

Seller
> Bot: What is your name?

John Textiles
> Bot: What is your pickup location?

Chennai
> Bot: Delivery location?

Bangalore
> ...continues collecting all details...

Bot: ✓ Shipment created! Reference: LL-123456
```

### Test 4: Complete Vendor Flow

```
Hi
> Bot asks for type

Vendor
> Bot: What is your company name?

Fast Trucks Ltd
> Bot: Phone number?

9876543210
> ...continues collecting details...

Bot: ✓ Your information registered!
```

---

## Part 5: Database

### View SQLite Database

```powershell
# Using sqlite3 (if installed)
sqlite3 "c:\Logistic Chatbot\backend\data\logilink.db"

# Or use any SQLite viewer
```

### Reset Database

```powershell
Remove-Item "c:\Logistic Chatbot\backend\data\logilink.db"
# Then restart backend - new DB auto-created
```

### Backup Database

```powershell
Copy-Item "c:\Logistic Chatbot\backend\data\logilink.db" "logilink_backup.db"
```

---

## Part 6: Production Deployment

### Before Going Live

1. **Verify WhatsApp Business Number**
   - Apply at: https://www.facebook.com/business/resources/whatsapp-business-api
   - Wait for approval (~24-48 hours)
   - Replace test number with real number

2. **Use Real AI Provider**
   - Option A: Keep Ollama but on a server
   - Option B: Switch to OpenAI API:
     ```env
     AI_PROVIDER=openai
     OPENAI_API_KEY=sk-...
     ```

3. **Deploy Backend**
   - Use cloud hosting: AWS, Heroku, DigitalOcean, Render, etc.
   - Set environment variables on host
   - Use permanent database (PostgreSQL or MySQL)

4. **Enable HTTPS**
   - Meta requires HTTPS
   - Use LetsEncrypt (free) or CloudFlare

5. **Configure Production Webhook**
   - Point webhook URL to production server
   - Use permanent domain (no ngrok)

### Example: Deploy to Heroku

```powershell
# Install Heroku CLI from https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create logilink-bot

# Set environment variables
heroku config:set WHATSAPP_API_TOKEN=your-token
heroku config:set WHATSAPP_PHONE_NUMBER_ID=your-id
# ... etc

# Deploy
git push heroku main
```

### Production Checklist

- [ ] WhatsApp Business account verified
- [ ] Real phone number activated
- [ ] Backend deployed to production
- [ ] HTTPS enabled
- [ ] Webhook URL updated
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Logging enabled
- [ ] Error monitoring set up

---

## Troubleshooting

### "Cannot connect to Ollama"

**Cause**: Ollama not running

**Fix**:
```powershell
ollama serve
```

Keep terminal open.

### "Model 'qwen2.5' not found"

**Cause**: Model not downloaded

**Fix**:
```powershell
ollama pull qwen2.5
```

Wait for download.

### "WhatsApp message not sent"

**Causes & Fixes**:

1. **API Token missing/invalid**
   - Check `.env` has `WHATSAPP_API_TOKEN`
   - Verify token is current (some expire)

2. **Phone Number ID incorrect**
   - Verify in Meta dashboard
   - Format must be digits only (no +)

3. **Webhook URL not reachable**
   - Check ngrok is running
   - Verify URL in Meta dashboard matches

4. **Phone number format**
   - Should be +91999999 (with country code)
   - System removes special characters automatically

### "Webhook verification failed"

**Cause**: Verify token mismatch

**Fix**:
1. Check `.env` has `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
2. Verify this matches token in Meta Dashboard
3. Both must be **exactly the same**

### Bot not responding to messages

**Checklist**:
- [ ] Backend running (`npm run dev`)
- [ ] Ollama running (`ollama serve`)
- [ ] ngrok running and URL updated
- [ ] API token valid
- [ ] Database file exists
- [ ] Check terminal for errors

### Database errors

**Fix**:
```powershell
# Delete old database
Remove-Item "c:\Logistic Chatbot\backend\data\logilink.db"

# Restart backend
npm run dev
```

---

## Support

### Documentation

- **Meta WhatsApp API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Ollama**: https://ollama.ai/library
- **Node.js**: https://nodejs.org/en/docs/

### Common Issues

1. **Port 5000 already in use**: Change `PORT` in `.env`
2. **ngrok expires**: Restart ngrok (URL changes)
3. **WhatsApp delays**: May take 10-30 seconds for delivery
4. **Bot forgets context**: Reload `.env` values, restart server

---

## Quick Start Commands

```powershell
# Terminal 1: Ollama
ollama serve

# Terminal 2: ngrok (for testing)
ngrok http 5000

# Terminal 3: Backend
cd "c:\Logistic Chatbot\backend"
npm run dev

# Terminal 4: Check health
curl http://localhost:5000/health
```

---

**You're ready to test LogiLink!** 🚀

Send a message to your WhatsApp test number and start a conversation with the bot.

---

**LogiLink v1.0.0** – The WhatsApp Logistics Coordinator
