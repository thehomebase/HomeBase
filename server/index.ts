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
    const tryPort = async (port: number): Promise<number> => {
      try {
        await new Promise((resolve, reject) => {
          server.listen(port, '0.0.0.0', resolve)
            .on('error', (err: any) => {
              if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is in use, trying next port...`);
                tryPort(port + 1).then(resolve).catch(reject);
              } else {
                reject(err);
              }
            });
        });
        return port;
      } catch (error) {
        if (port >= 5010) {  // Max 10 retries
          throw new Error('Unable to find an available port');
        }
        return tryPort(port + 1);
      }
    };

    const startPort = Number(process.env.PORT || 5000);
    const finalPort = await tryPort(startPort);
    log(`Server running on port ${finalPort}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();