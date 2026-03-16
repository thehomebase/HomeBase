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

interface LockInfo {
  userId: number;
  userName: string;
  userRole: string;
  ws: WebSocket;
  lastHeartbeat: number;
}

const transactionLocks = new Map<number, LockInfo>();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function cleanupExpiredLocks() {
  const now = Date.now();
  for (const [txId, lock] of transactionLocks) {
    if (now - lock.lastHeartbeat > LOCK_TIMEOUT_MS) {
      transactionLocks.delete(txId);
      broadcastTransactionUnlocked(txId);
    }
  }
}

setInterval(cleanupExpiredLocks, 30_000);

function broadcastTransactionLocked(txId: number, lock: LockInfo) {
  const message = JSON.stringify({
    type: 'transaction:locked',
    payload: {
      transactionId: txId,
      lockedBy: { userId: lock.userId, name: lock.userName, role: lock.userRole },
    },
  });
  for (const [userId, connections] of userConnections) {
    if (userId === lock.userId) continue;
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }
}

function broadcastTransactionUnlocked(txId: number) {
  const message = JSON.stringify({
    type: 'transaction:unlocked',
    payload: { transactionId: txId },
  });
  for (const [, connections] of userConnections) {
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }
}

function handleLockMessage(ws: WebSocket, userId: number, data: any) {
  const { type, payload } = data;
  const rawTxId = payload?.transactionId;
  if (!rawTxId) return;
  const txId = typeof rawTxId === 'string' ? parseInt(rawTxId, 10) : rawTxId;
  if (!Number.isFinite(txId) || txId <= 0) return;

  switch (type) {
    case 'transaction:lock': {
      const existing = transactionLocks.get(txId);
      if (existing && existing.userId !== userId && existing.ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'transaction:locked',
          payload: {
            transactionId: txId,
            lockedBy: { userId: existing.userId, name: existing.userName, role: existing.userRole },
          },
        }));
        return;
      }
      const lockInfo: LockInfo = {
        userId,
        userName: payload.userName || 'Unknown',
        userRole: payload.userRole || 'user',
        ws,
        lastHeartbeat: Date.now(),
      };
      transactionLocks.set(txId, lockInfo);
      ws.send(JSON.stringify({
        type: 'transaction:lock_acquired',
        payload: { transactionId: txId },
      }));
      broadcastTransactionLocked(txId, lockInfo);
      break;
    }
    case 'transaction:unlock': {
      const lock = transactionLocks.get(txId);
      if (lock && lock.userId === userId && lock.ws === ws) {
        transactionLocks.delete(txId);
        broadcastTransactionUnlocked(txId);
      }
      break;
    }
    case 'transaction:heartbeat': {
      const lock = transactionLocks.get(txId);
      if (lock && lock.userId === userId) {
        lock.lastHeartbeat = Date.now();
      }
      break;
    }
    case 'transaction:query_lock': {
      const lock = transactionLocks.get(txId);
      if (lock && lock.userId !== userId && lock.ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'transaction:locked',
          payload: {
            transactionId: txId,
            lockedBy: { userId: lock.userId, name: lock.userName, role: lock.userRole },
          },
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'transaction:unlocked',
          payload: { transactionId: txId },
        }));
      }
      break;
    }
  }
}

function releaseLocksForSocket(ws: WebSocket, userId: number) {
  for (const [txId, lock] of transactionLocks) {
    if (lock.ws === ws) {
      transactionLocks.delete(txId);
      broadcastTransactionUnlocked(txId);
    }
  }
}

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

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (typeof data.type === 'string' && data.type.startsWith('transaction:')) {
          handleLockMessage(ws, userId, data);
        }
      } catch {}
    });

    ws.on('close', () => {
      releaseLocksForSocket(ws, userId);
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
