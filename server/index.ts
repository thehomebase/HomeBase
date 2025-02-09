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

(async () => {
  try {
    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in request:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Use port 3000 instead of 5000
    const PORT = Number(process.env.PORT || 3000);
    log(`Attempting to start server on port ${PORT}`);

    if (app.get("env") === "development") {
      // Setup Vite before starting the server
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server on the specified port
    await new Promise<void>((resolve, reject) => {
      server.listen(PORT, '0.0.0.0', () => {
        log(`Server running on port ${PORT}`);
        resolve();
      }).on('error', (error: Error & { code?: string }) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Error: Port ${PORT} is already in use.`);
          console.error('Please ensure no other service is running on this port.');
          process.exit(1);
        } else {
          console.error(`Failed to start server:`, error);
          reject(error);
        }
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();