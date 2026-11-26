# LogiLink – Command Reference

Quick reference for all commands needed to run LogiLink.

---

## Setup Commands

### Install Dependencies

```bash
cd backend
npm install
```

Output should show packages installed.

---

## Running the Bot (3 Terminals)

### Terminal 1: Ollama (Free Local AI)

**First time only:**
```bash
ollama pull qwen2.5
```

**Always:**
```bash
ollama serve
```

Keep this running.

---

### Terminal 2: Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✓ Server running on http://localhost:5000

WhatsApp Webhook Endpoints:
  - GET  /whatsapp/webhook (verification)
  - POST /whatsapp/webhook (message receiver)
```

Keep this running.

---

### Terminal 3: ngrok (for local testing)

```bash
ngrok http 5000
```

**Expected Output:**
```
Session Status                online
Account                       [your email]
Version                       3.0.0
Region                        United States (us)
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:5000
```

**Copy the HTTPS URL** for Meta Dashboard.

Keep this running.

---

## Database Commands

### Initialize Database (Automatic on first run)

```bash
npm run db:init
```

**Output:**
```
✓ Database initialized successfully at: ./data/logilink.db
```

### Seed Database (Automatic on first run)

```bash
npm run db:seed
```

**Output:**
```
✓ Seeded 24 FAQ entries
✓ Seeded sample seller and vendor data
```

### View Database (Optional - requires sqlite3)

```bash
sqlite3 backend/data/logilink.db

# In SQLite prompt:
> .schema users
> SELECT * FROM conversations;
> .quit
```

### Reset Database

```bash
# Delete the database file
rm backend/data/logilink.db

# Or on Windows:
Remove-Item backend\data\logilink.db

# Restart backend - new DB auto-created
npm run dev
```

---

## Testing Commands

### Check Backend Health

```bash
curl http://localhost:5000/health
```

**Output:**
```json
{"status":"ok","message":"LogiLink WhatsApp bot is running"}
```

### Check WhatsApp Webhook Health

```bash
curl http://localhost:5000/whatsapp/health
```

**Output:**
```json
{"status":"ok","provider":"meta","configured":true}
```

### View Server Logs

Just watch Terminal 2 (backend) for real-time logs.

---

## Configuration Commands

### Create Environment File

```bash
copy .env.example .env
```

(Windows PowerShell)

Or:

```bash
cp .env.example .env
```

(Linux/Mac)

### Edit Environment File

Use any text editor to open `.env`:

```
PORT=5000
WHATSAPP_API_TOKEN=your-token-here
# ... etc
```

### Verify Environment

```bash
# View current settings (without secrets)
cat backend/.env | grep -v "="  # Show variable names only
```

---

## Troubleshooting Commands

### Find Process Using Port 5000

```bash
# Windows PowerShell:
netstat -ano | findstr :5000

# Linux/Mac:
lsof -i :5000
```

### Kill Process on Port 5000

```bash
# Windows PowerShell:
Stop-Process -Id <PID>

# Linux/Mac:
kill -9 <PID>
```

### Check if Ollama is Running

```bash
curl http://localhost:11434/

# Should return 404 (but confirms Ollama is responding)
```

### Check if Backend is Running

```bash
curl http://localhost:5000/health

# Should return: {"status":"ok",...}
```

### Check if ngrok is Running

Just look at Terminal 3 output. URL should be displayed.

### View Node Version

```bash
node --version
```

Should show v18+ for LogiLink to work.

### View npm Version

```bash
npm --version
```

---

## Advanced Commands

### Start Backend in Production Mode

```bash
NODE_ENV=production npm start
```

### Start with Custom Port

```bash
PORT=8080 npm run dev
```

### Watch Database for Changes

```bash
# Install sqlite3 CLI first, then:
watch -n 2 "sqlite3 backend/data/logilink.db 'SELECT COUNT(*) as users FROM users; SELECT COUNT(*) as messages FROM messages;'"
```

(Linux/Mac only)

### Export Database to CSV

```bash
# Install sqlite3 CLI, then:
sqlite3 -header -csv backend/data/logilink.db "SELECT * FROM users;" > users.csv
sqlite3 -header -csv backend/data/logilink.db "SELECT * FROM shipments;" > shipments.csv
```

---

## npm Scripts (Defined in package.json)

```bash
# Start production server
npm start

# Start development server (with watch)
npm run dev

# Initialize database
npm run db:init

# Seed database with sample data
npm run db:seed
```

---

## Common Workflows

### Complete Local Setup

```bash
# Terminal 1
ollama pull qwen2.5
ollama serve

# Terminal 2
cd backend
npm install
copy .env.example .env
# Edit .env with your settings
npm run dev

# Terminal 3
ngrok http 5000

# Then:
# 1. Copy ngrok URL
# 2. Configure webhook in Meta Dashboard
# 3. Send test message to WhatsApp
```

### Full Database Reset

```bash
# Terminal: Backend (Ctrl+C to stop)
npm run dev

# Terminal: New prompt
rm backend/data/logilink.db
npm run db:init
npm run db:seed

# Restart backend if needed
npm run dev
```

### Deploy to Production

```bash
# Build/prepare backend
npm install
npm run db:init

# Start production server
NODE_ENV=production PORT=5000 npm start
```

---

## Git Commands (Optional)

### Initialize Git Repository

```bash
cd c:\Logistic Chatbot
git init
git add .
git commit -m "Initial LogiLink commit"
```

### Create .gitignore

Already included in project.

### View Changes

```bash
git status
git diff
```

---

## Windows PowerShell Specific

### Copy File
```powershell
Copy-Item source.txt destination.txt
```

### Remove File
```powershell
Remove-Item file.txt
```

### Remove Directory
```powershell
Remove-Item -Recurse -Force directory_name
```

### List Files
```powershell
Get-ChildItem
```

### Change Directory
```powershell
cd path\to\directory
```

### View Environment Variable
```powershell
$env:VARNAME
```

### Set Environment Variable (Temporary)
```powershell
$env:PORT = "8080"
```

---

## Useful Linux/Mac Commands

### Check Port

```bash
lsof -i :5000
netstat -tuln | grep 5000
```

### Kill Process

```bash
kill -9 <PID>
```

### View File

```bash
cat .env
less server.js
```

### Edit File

```bash
nano .env
vi server.js
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
LOG_LEVEL=debug npm run dev
```

### Check Database Integrity

```bash
sqlite3 backend/data/logilink.db ".integrity_check"
```

### View Package Vulnerabilities

```bash
npm audit
```

### Fix Package Vulnerabilities

```bash
npm audit fix
```

---

## Command Syntax Summary

| Task | Command |
|------|---------|
| Install | `npm install` |
| Start Dev | `npm run dev` |
| Start Prod | `npm start` |
| Init DB | `npm run db:init` |
| Seed DB | `npm run db:seed` |
| Health Check | `curl http://localhost:5000/health` |
| View Logs | Watch Terminal 2 output |
| Reset DB | `rm backend/data/logilink.db` |

---

## Error Recovery

### If Backend Crashes

```bash
# In backend terminal:
npm run dev
```

Restarts immediately.

### If Database Corrupts

```bash
rm backend/data/logilink.db
npm run dev
```

Recreates from scratch.

### If Port Conflicts

```bash
# Change port:
PORT=8080 npm run dev

# Or kill conflicting process:
netstat -ano | findstr :5000
Stop-Process -Id <PID>
```

### If Ollama Crashes

```bash
# Restart Ollama in Terminal 1:
ollama serve
```

Backend will retry.

### If ngrok Expires

```bash
# Kill ngrok (Ctrl+C) and restart:
ngrok http 5000
```

Copy new URL to Meta Dashboard.

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│  LogiLink Command Reference             │
├─────────────────────────────────────────┤
│ Setup:   npm install                   │
│ Dev:     npm run dev                    │
│ DB:      npm run db:init                │
│ Health:  curl localhost:5000/health     │
│ Ollama:  ollama serve                   │
│ ngrok:   ngrok http 5000                │
│ Config:  .env                           │
│ Logs:    Terminal output                │
└─────────────────────────────────────────┘
```

---

## Support

For command-specific help:

```bash
# npm help
npm help
npm help install
npm help run

# Node.js help
node --help
node --version
```

---

**LogiLink v1.0.0** – Command Reference Complete
