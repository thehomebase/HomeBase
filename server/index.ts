
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
  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';
  
  try {
    log(`Starting server on port ${port}`);
    await new Promise<void>((resolve, reject) => {
      server.listen(port, host)
        .once('listening', () => {
          log(`Server successfully started and listening on ${host}:${port}`);
          process.env.PORT = String(port);
          resolve();
        })
        .once('error', (err: NodeJS.ErrnoException) => {
          reject(err);
        });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error starting server: ${errorMessage}`);
    throw error;
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
