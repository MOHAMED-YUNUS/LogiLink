import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { initDatabase } from './db/init.js';
import { seedDatabase } from './db/seed.js';
import { closeDatabase } from './db/connection.js';
import { checkAIHealth } from './services/ai-service.js';

// Import routes
import whatsappRoutes from './routes/whatsapp.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LogiLink WhatsApp bot is running' });
});

// WhatsApp Routes
app.use('/whatsapp', whatsappRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   LogiLink - WhatsApp Logistics Chatbot     ║');
    console.log('║                v1.0.0                       ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Initialize database
    console.log('📦 Initializing database...');
    await initDatabase();

    // Seed database
    console.log('🌱 Seeding database...');
    await seedDatabase();

    // Check AI health (non-blocking - server starts even if AI is down)
    console.log('🤖 Checking AI service...');
    try {
      const aiHealth = await checkAIHealth();
      if (aiHealth.healthy) {
        console.log(`✓ AI Service: ${aiHealth.provider.toUpperCase()} - Model: ${aiHealth.model}`);
      } else {
        console.warn(`⚠ AI Service Issue: ${aiHealth.error}`);
        if (aiHealth.instructions) {
          console.warn(`\n${aiHealth.instructions}\n`);
        }
      }
    } catch (aiError) {
      console.warn(`⚠ AI Service check failed (non-blocking): ${aiError.message}`);
    }

    // Check WhatsApp configuration
    console.log('📱 WhatsApp Configuration:');
    const provider = process.env.WHATSAPP_API_PROVIDER || 'meta';
    const hasToken = !!process.env.WHATSAPP_API_TOKEN;
    console.log(`   Provider: ${provider}`);
    console.log(`   API Token: ${hasToken ? '✓ Configured' : '✗ Not configured'}`);

    if (!hasToken) {
      console.warn(`\n⚠️  WARNING: WhatsApp API token not configured.`);
      console.warn(`   Update .env with WHATSAPP_API_TOKEN to enable WhatsApp integration.`);
      console.warn(`   Testing mode: chatbot will process messages but cannot send WhatsApp replies.\n`);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✓ Server running on http://localhost:${PORT}`);
      console.log('\nWhatsApp Webhook Endpoints:');
      console.log('  - GET  /whatsapp/webhook (verification)');
      console.log('  - POST /whatsapp/webhook (message receiver)');
      console.log('  - GET  /whatsapp/health (status check)\n');
      console.log('To test locally, use ngrok: ngrok http 5000');
      console.log('Then configure webhook URL in Meta: https://your-ngrok-url.ngrok.io/whatsapp/webhook\n');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      await closeDatabase();
      console.log('✓ Database connection closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
