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

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Try different ports if the default port is in use
    const tryPort = async (startPort: number): Promise<number> => {
      for (let port = startPort; port < startPort + 10; port++) {
        try {
          await new Promise<void>((resolve, reject) => {
            const onError = (error: Error & { code?: string }) => {
              if (error.code === 'EADDRINUSE') {
                console.log(`Port ${port} in use, trying next port...`);
                server.removeListener('error', onError);
                reject(error);
              } else {
                console.error(`Failed to bind to port ${port}:`, error);
                reject(error);
              }
            };

            server.once('error', onError);
            server.listen(port, '0.0.0.0', () => {
              server.removeListener('error', onError);
              resolve();
            });
          });
          return port;
        } catch (err: unknown) {
          const error = err as Error & { code?: string };
          if (error.code !== 'EADDRINUSE') throw error;
        }
      }
      throw new Error('No available ports found');
    };

    const PORT = Number(process.env.PORT || 5000);
    const actualPort = await tryPort(PORT);
    log(`Server running on port ${actualPort}`);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();