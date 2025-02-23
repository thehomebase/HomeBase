import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server as HttpServer } from "http";

// Log environment details
log(`Node environment: ${process.env.NODE_ENV}`);
log(`Initial PORT environment variable: ${process.env.PORT}`);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint - BEFORE auth middleware
app.get('/health', (_req, res) => {
  log('Health check accessed');
  res.json({ status: 'ok', port: process.env.PORT });
});

// Basic test route - BEFORE auth middleware
app.get('/test', (_req, res) => {
  log('Test route accessed');
  res.json({ message: 'Server is running', port: process.env.PORT });
});

// Simplified server startup function with proper port handling
async function startServer(server: HttpServer): Promise<void> {
  // In production (Replit deployment), use port 80, otherwise fallback to 3000
  const port = process.env.NODE_ENV === 'production' ? 80 : (Number(process.env.PORT) || 3000);
  const host = '0.0.0.0';

  try {
    log(`Starting server on ${host}:${port}`);
    await new Promise<void>((resolve, reject) => {
      const serverInstance = server.listen(port, host);

      serverInstance
        .once('listening', () => {
          log(`Server successfully started and listening on ${host}:${port}`);
          process.env.PORT = String(port);
          resolve();
        })
        .once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${port} is already in use`);
          }
          reject(err);
        });

      // Add error handler for the server instance
      serverInstance.on('error', (err: NodeJS.ErrnoException) => {
        log(`Server error encountered: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
          process.exit(1);
        }
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Failed to start server: ${errorMessage}`);
    throw error;
  }
}

// Main application startup with improved error handling
(async () => {
  try {
    log(`Beginning application initialization...`);

    const server = registerRoutes(app);

    // Setup basic error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error in request: ${message}`);
      res.status(status).json({ error: message });
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
    log('Fatal error during application startup:', error);
    process.exit(1);
  }
})();