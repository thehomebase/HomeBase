import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server as HttpServer } from "http";

// Log environment details
log(`Initial PORT environment variable: ${process.env.PORT}`);
log(`Node environment: ${process.env.NODE_ENV}`);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic test route - BEFORE auth middleware
app.get('/test', (_req, res) => {
  log('Test route accessed');
  res.json({ message: 'Server is running', port: process.env.PORT });
});

// Health check endpoint - BEFORE auth middleware
app.get('/health', (_req, res) => {
  log('Health check accessed');
  res.json({ status: 'ok', port: process.env.PORT });
});

// Simplified server startup function with port fallback
async function startServer(server: HttpServer): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const startPort = isProduction ? 80 : (Number(process.env.PORT) || 5000);
  const host = '0.0.0.0';
  const maxRetries = isProduction ? 1 : 10; // In production, don't retry ports
  let currentPort = startPort;
  let started = false;

  for (let attempt = 0; attempt < maxRetries && !started; attempt++) {
    try {
      log(`Attempting to start server on port ${currentPort} (attempt ${attempt + 1}/${maxRetries})`);

      await new Promise<void>((resolve, reject) => {
        server.listen(currentPort, host)
          .once('listening', () => {
            log(`Server successfully started and listening on ${host}:${currentPort}`);
            // Update PORT environment variable to match actual port
            process.env.PORT = String(currentPort);
            started = true;
            resolve();
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${currentPort} is in use, trying next port`);
              currentPort++;
              server.close();
              resolve(); // Resolve to try next port
            } else {
              reject(err);
            }
          });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error on port ${currentPort}: ${errorMessage}`);
      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to start server after ${maxRetries} attempts`);
      }
    }
  }

  if (!started) {
    throw new Error(`Could not find an available port after ${maxRetries} attempts`);
  }
}

// Main application startup
(async () => {
  try {
    log(`Beginning application initialization...`);

    const server = registerRoutes(app);

    // Setup basic error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in request:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Start with minimal configuration first
    log(`Starting server with minimal configuration...`);
    await startServer(server);

    // Then gradually add middleware
    log(`Adding Vite middleware...`);
    try {
      await setupVite(app, server);
      log(`Vite middleware setup complete`);
    } catch (err) {
      log(`Failed to start in development mode, trying production: ${err}`);
      serveStatic(app);
    }

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Starting graceful shutdown...');
      server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Starting graceful shutdown...');
      server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Fatal error during application startup:', error);
    process.exit(1);
  }
})();