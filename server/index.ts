import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server as HttpServer } from "http";

// Enhanced environment logging
const environment = process.env.NODE_ENV || 'development';
log(`Starting application in ${environment} environment`);
log(`Initial PORT environment variable: ${process.env.PORT}`);

const app = express();
app.use(express.json());
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

// Simplified server startup function with proper port handling
async function startServer(server: HttpServer): Promise<void> {
  // ALWAYS serve the app on port 5000
  const port = 5000;
  const host = '0.0.0.0';

  log(`Environment: ${environment}`);
  log(`Selected port: ${port}`);

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
    log(`Fatal error during application startup: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();