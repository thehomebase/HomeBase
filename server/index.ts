import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server as HttpServer } from "http";
import WebSocket from 'ws';

// Add startup message to verify nodemon restarts
log(`Server starting... [${new Date().toISOString()}]`);

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

// Simplified server startup function with retry logic for port binding
async function startServer(server: HttpServer): Promise<void> {
  // Define potential ports to try - start with default and fallback to others
  const defaultPort = 5000;
  const fallbackPorts = [3000, 8080, 8000, 4000];
  const host = '0.0.0.0';
  
  log(`Environment: ${environment}`);
  
  // Try the default port first, then fallbacks if needed
  let currentPort = defaultPort;
  let portIndex = 0;
  let serverStarted = false;
  
  while (!serverStarted) {
    log(`Attempting to start server on port: ${currentPort}`);
    
    try {
      await new Promise<void>((resolve, reject) => {
        const serverInstance = server.listen(currentPort, host);
        
        serverInstance
          .once('listening', () => {
            log(`✅ Server successfully started and listening on ${host}:${currentPort}`);
            process.env.PORT = String(currentPort);
            serverStarted = true;
            resolve();
          })
          .once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${currentPort} is already in use, trying another port...`);
              
              // Try next port
              if (portIndex < fallbackPorts.length) {
                currentPort = fallbackPorts[portIndex++];
                serverInstance.close();
                reject(new Error('PORT_IN_USE'));
              } else {
                log(`All ports are in use. Please free one of these ports: ${[defaultPort, ...fallbackPorts].join(', ')}`);
                reject(err);
              }
            } else {
              log(`Server error: ${err.message}`);
              reject(err);
            }
          });
          
        // Enhanced WebSocket handling for HMR
        serverInstance.on('upgrade', (request, socket, head) => {
          const url = new URL(request.url!, `http://${request.headers.host}`);
          
          // Allow Vite HMR paths (updated to match Vite 5.4.x format)
          if (url.pathname.startsWith('/__vite_hmr') || 
              url.pathname.startsWith('/@vite/client') || 
              url.pathname.startsWith('/hmr')) {
            // Don't interfere with the WebSocket connection - let it continue
          } else {
            // Only destroy sockets that aren't for HMR
            socket.destroy();
          }
        });
      });
      
      // If we get here, the server started successfully
      break;
      
    } catch (error) {
      if (error instanceof Error && error.message === 'PORT_IN_USE') {
        // Continue the loop to try the next port
        continue;
      }
      
      // For other errors, throw and exit
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Failed to start server: ${errorMessage}`);
      throw error;
    }
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