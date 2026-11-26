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
    try {
      // Delete old database if it exists (force recreate)
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const dbPath = process.env.DATABASE_PATH || './data/logilink.db';
      try {
        await fs.unlink(dbPath);
        console.log('🔄 Removed old database, recreating...');
      } catch (e) {
        // File doesn't exist, that's OK
      }
      
      await initDatabase();
      console.log('✓ Database initialized successfully');
    } catch (dbError) {
      console.error('✗ Database initialization error:', dbError.message);
      throw dbError;
    }

    // Seed database (non-blocking with timeout)
    console.log('🌱 Seeding database...');
    try {
      const seedPromise = seedDatabase();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Seed database timeout')), 5000)
      );
      await Promise.race([seedPromise, timeoutPromise]);
      console.log('✓ Database seeded successfully');
    } catch (seedError) {
      console.warn('⚠ Database seeding warning (non-blocking):', seedError.message);
    }

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
    const provider = process.env.WHATSAPP_API_PROVIDER || 'gupshup';
    const hasGupshupKey = !!process.env.GUPSHUP_API_KEY;
    const hasMetaToken = !!process.env.WHATSAPP_API_TOKEN;
    console.log(`   Provider: ${provider}`);
    console.log(`   Gupshup Key: ${hasGupshupKey ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`   Meta Token: ${hasMetaToken ? '✓ Configured' : '✗ Not configured'}`);

    if (!hasGupshupKey && !hasMetaToken) {
      console.warn(`\n⚠️  WARNING: WhatsApp API credentials not configured.`);
      console.warn(`   Update .env with Gupshup or Meta credentials to enable WhatsApp integration.\n`);
    }

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✓ Server running on http://0.0.0.0:${PORT}`);
      console.log('\nWhatsApp Webhook Endpoints:');
      console.log('  - GET  /whatsapp/webhook (verification)');
      console.log('  - POST /whatsapp/webhook (message receiver)');
      console.log('  - GET  /whatsapp/health (status check)\n');
    });

    // Set server timeout
    server.setTimeout(30000);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      await closeDatabase();
      console.log('✓ Database connection closed');
      process.exit(0);
    });

    // Handle unhandled errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Start server immediately
console.log('Starting LogiLink server...');
startServer().catch(error => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
