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

// Modified server startup function to handle port configuration
async function startServer(server: HttpServer): Promise<void> {
  // Use PORT from environment or fallback to 3001 (changed from 5000)
  const port = Number(process.env.PORT) || 3001;
  const host = '0.0.0.0';

  try {
    log(`Initializing server startup sequence...`);

    await new Promise<void>((resolve, reject) => {
      log(`Attempting to bind server to ${host}:${port}...`);

      const serverInstance = server.listen(port, host, () => {
        log(`Server successfully bound and listening on ${host}:${port}`);
        resolve();
      });

      // Add error handler
      serverInstance.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log(`Error: Port ${port} is already in use. Using fallback port.`);
          // Try another port
          const fallbackPort = port + 1;
          log(`Attempting to bind to fallback port ${fallbackPort}...`);

          serverInstance.listen(fallbackPort, host, () => {
            log(`Server successfully bound to fallback port ${fallbackPort}`);
            process.env.PORT = String(fallbackPort);
            resolve();
          });
        } else {
          log(`Error starting server: ${err.message}`);
          reject(err);
        }
      });
    });

    log(`Server startup sequence completed successfully`);
  } catch (err) {
    log(`Critical error during server startup: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

// Main application startup
(async () => {
  try {
    log(`Beginning application initialization...`);

    const server = registerRoutes(app);

    // Setup error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in request:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Attempt to start in production mode first
    log(`Starting server in production mode...`);
    serveStatic(app);

    // Start server with dynamic port
    await startServer(server);

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