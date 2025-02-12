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

    // Try ports in sequence until one works
    const ports = [5000, 5001, 3000];
    let currentPortIndex = 0;

    const tryPort = async (port: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        server.once('error', (error: Error & { code?: string }) => {
          if (error.code === 'EADDRINUSE') {
            if (currentPortIndex < ports.length - 1) {
              currentPortIndex++;
              log(`Port ${port} is in use, trying next port ${ports[currentPortIndex]}`);
              tryPort(ports[currentPortIndex]).then(resolve).catch(reject);
            } else {
              reject(new Error('All ports are in use. Please free up one of the required ports.'));
            }
          } else {
            reject(error);
          }
        });

        server.listen(port, '0.0.0.0', () => {
          log(`Server running on port ${port}`);
          resolve();
        });
      });
    };

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    await tryPort(ports[currentPortIndex]);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();