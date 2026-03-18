import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server as HttpServer } from "http";
import WebSocket from 'ws';
import { WebhookHandlers } from "./webhookHandlers";
import { startDripScheduler } from "./drip-scheduler";
import { startReminderScheduler } from "./reminder-scheduler";
import { startListingAlertScheduler } from "./listing-alert-scheduler";
import { setupWebSocket } from "./websocket";

process.on('uncaughtException', (err) => {
  if (err instanceof TypeError && err.message?.includes('Cannot set property message of')) {
    console.error('[DB] Neon WebSocket connection error (non-fatal):', err.message);
    return;
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Add startup message to verify nodemon restarts
log(`Server starting... [${new Date().toISOString()}]`);

// Enhanced environment logging
const environment = process.env.NODE_ENV || 'development';
log(`Starting application in ${environment} environment`);
log(`Initial PORT environment variable: ${process.env.PORT}`);

const app = express();

// Register Stripe webhook route BEFORE express.json()
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(cookieParser());
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check endpoint - BEFORE auth middleware
app.get('/health', (_req, res) => {
  log('Health check accessed');
  res.json({ 
    status: 'ok', 
    environment,
    port: process.env.PORT 
  });
});

// Basic test route - BEFORE auth middleware
app.get('/test', (_req, res) => {
  log('Test route accessed');
  res.json({ 
    message: 'Server is running', 
    environment,
    port: process.env.PORT 
  });
});

// Simplified server startup function optimized for Replit environment
async function startServer(server: HttpServer): Promise<void> {
  // Get port from environment variable or use a default
  // Replit sets process.env.PORT automatically, we should respect it
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const host = '0.0.0.0'; // Bind to all interfaces for Replit
  
  log(`Environment: ${environment}`);
  log(`Using port from environment: ${port}`);
  
  try {
    await new Promise<void>((resolve, reject) => {
      // Simple server start with one attempt - Replit manages port allocation
      const serverInstance = server.listen(port, host);
      
      serverInstance
        .once('listening', () => {
          log(`✅ Server successfully started and listening on ${host}:${port}`);
          resolve();
        })
        .once('error', (err: NodeJS.ErrnoException) => {
          log(`Server error: ${err.message}`);
          reject(err);
        });
        
      setupWebSocket(serverInstance);

      serverInstance.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url!, `http://${request.headers.host}`);
        
        if (url.pathname === '/ws' ||
            url.pathname.startsWith('/__vite_hmr') || 
            url.pathname.startsWith('/@vite/client') || 
            url.pathname.startsWith('/hmr')) {
          // Let app WS and HMR connections pass through
        } else {
          socket.destroy();
        }
      });
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Failed to start server: ${errorMessage}`);
    throw error;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    const { runMigrations } = await import('stripe-replit-sync');
    const { getStripeSync } = await import('./stripeClient');

    log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      if (result?.webhook?.url) {
        log(`Webhook configured: ${result.webhook.url}`);
      } else {
        log('Webhook setup returned no URL (sandbox mode) - webhooks will work when deployed');
      }
    } catch (webhookError) {
      log(`Webhook setup skipped: ${webhookError}`);
    }

    log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

// Main application startup with improved error handling
(async () => {
  try {
    log(`Beginning application initialization...`);

    await initStripe();

    const { initDropboxSchema } = await import("./dropbox-service");
    await initDropboxSchema().catch(e => log(`Dropbox schema init: ${e.message}`));

    const server = registerRoutes(app);

    // Setup basic error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      log(`Error in request: ${err.message || "Unknown error"}`);
      res.status(status).json({ error: status < 500 ? (err.message || "Bad request") : "Internal Server Error" });
    });

    // Start with minimal configuration first
    log(`Starting server with minimal configuration...`);
    await startServer(server);

    // Then gradually add middleware
    log(`Adding Vite middleware...`);
    try {
      if (environment === 'development') {
        await setupVite(app, server);
        log(`Vite middleware setup complete`);
      } else {
        log(`Running in production mode, using static file serving`);
        serveStatic(app);
      }
    } catch (err) {
      log(`Failed to setup middleware: ${err}`);
      log(`Falling back to static file serving`);
      serveStatic(app);
    }

    startDripScheduler();
    startReminderScheduler();
    startListingAlertScheduler();

    const shutdown = () => {
      log('Graceful shutdown initiated...');
      server.close(() => {
        log('Server shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    log(`Fatal error during application startup: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
