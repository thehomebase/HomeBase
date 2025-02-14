import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server as HttpServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add error logging middleware with more detail
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (err.stack) {
    console.error('Stack trace:', err.stack);
  }
  next(err);
});

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log session information for debugging
  if (req.session) {
    console.log('Session ID:', req.sessionID);
    console.log('Session Data:', req.session);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Improved server startup function with better port handling
async function startServer(server: HttpServer, initialPort: number = 5000, maxAttempts: number = 5) {
  let port = initialPort;
  const maxPort = initialPort + maxAttempts;

  while (port < maxPort) {
    try {
      await new Promise<void>((resolve, reject) => {
        log(`Attempting to start server on port ${port}...`);
        server.listen(port, '0.0.0.0')
          .once('listening', () => {
            log(`Server successfully started and running on port ${port}`);
            resolve();
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${port} is in use, trying next port...`);
              server.close();
              port++;
              reject(err);
            } else {
              log(`Error starting server: ${err.message}`);
              reject(err);
            }
          });
      });
      return port; // Successfully started
    } catch (err) {
      if (port >= maxPort) {
        throw new Error(`Failed to find an available port after ${maxAttempts} attempts`);
      }
      // Continue to next port
      continue;
    }
  }
  throw new Error('Failed to start server');
}

// Main application startup
(async () => {
  try {
    const server = registerRoutes(app);

    // Setup error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in request:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup development environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with port fallback, using PORT from environment or 5000 as default
    const initialPort = parseInt(process.env.PORT || '5000', 10);
    log(`Starting server with initial port ${initialPort}`);
    await startServer(server, initialPort);

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Starting graceful shutdown...');
      server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Starting graceful shutdown...');
      server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();