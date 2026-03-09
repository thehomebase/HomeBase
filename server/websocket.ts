import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import { pool } from './db';
import { log } from './vite';

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      result[key] = decodeURIComponent(val);
    }
  });
  return result;
}

const userConnections = new Map<number, Set<WebSocket>>();

let wss: WebSocketServer;

export function setupWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);

    if (url.pathname === '/ws') {
      authenticateWebSocket(request)
        .then((userId) => {
          if (!userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          wss.handleUpgrade(request, socket, head, (ws) => {
            (ws as any).userId = userId;
            wss.emit('connection', ws, request);
          });
        })
        .catch(() => {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          socket.destroy();
        });
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const userId = (ws as any).userId as number;

    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(ws);

    ws.send(JSON.stringify({ type: 'connected', payload: { userId } }));

    ws.on('close', () => {
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
    });

    ws.on('error', () => {
      ws.close();
    });
  });

  log('WebSocket server initialized on /ws');
}

async function authenticateWebSocket(request: IncomingMessage): Promise<number | null> {
  try {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies['session'];
    if (!sessionCookie) return null;

    const sid = decodeSessionId(sessionCookie);
    if (!sid) return null;

    const result = await pool.query(
      'SELECT sess FROM session WHERE sid = $1 AND expire > NOW()',
      [sid]
    );

    if (result.rows.length === 0) return null;

    const sess = result.rows[0].sess;
    const passportData = typeof sess === 'string' ? JSON.parse(sess) : sess;

    if (passportData?.passport?.user) {
      return passportData.passport.user;
    }

    return null;
  } catch (err) {
    console.error('WebSocket auth error:', err);
    return null;
  }
}

function decodeSessionId(cookieValue: string): string | null {
  try {
    if (cookieValue.startsWith('s:')) {
      return cookieValue.slice(2).split('.')[0];
    }
    return cookieValue.split('.')[0];
  } catch {
    return null;
  }
}

export function broadcastToUser(userId: number, event: { type: string; payload: any }) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify(event);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function broadcastToUsers(userIds: number[], event: { type: string; payload: any }) {
  for (const userId of userIds) {
    broadcastToUser(userId, event);
  }
}

export function getConnectedUserCount(): number {
  return userConnections.size;
}
