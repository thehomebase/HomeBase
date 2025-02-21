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

// Basic test route
app.get('/test', (_req, res) => {
  res.json({ message: 'Server is running' });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Simplified server startup function
async function startServer(server: HttpServer): Promise<void> {
  const port = Number(process.env.PORT) || 5000;
  const host = '0.0.0.0';

  log(`Starting server with configuration:`);
  log(`- PORT from environment: ${process.env.PORT}`);
  log(`- Computed port: ${port}`);
  log(`- Host: ${host}`);

  try {
    await new Promise<void>((resolve, reject) => {
      log(`Attempting to bind server to ${host}:${port}...`);

      server.listen(port, host, () => {
        log(`Server successfully started and listening on ${host}:${port}`);
        resolve();
      }).on('error', (err: NodeJS.ErrnoException) => {
        log(`Error while starting server: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is already in use, please set a different PORT in .env`);
        }
        reject(err);
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Failed to start server: ${errorMessage}`);
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