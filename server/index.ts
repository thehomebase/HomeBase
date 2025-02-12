import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add error logging middleware
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  next(err);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

// Create a clean shutdown function
function shutdown(server: any) {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Server shutdown complete');
      resolve(true);
    });
  });
}

(async () => {
  try {
    const server = registerRoutes(app);

    // Add error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in request:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    const port = parseInt(process.env.PORT || '3000', 10);

    // Setup development environment first if needed
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Attempt to start the server
    server.listen(port, '0.0.0.0', () => {
      log(`Server running on port ${port}`);
    }).on('error', async (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please check for other running processes.`);
        process.exit(1);
      } else {
        console.error('Failed to start server:', error);
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Starting graceful shutdown...');
      await shutdown(server);
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Starting graceful shutdown...');
      await shutdown(server);
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();