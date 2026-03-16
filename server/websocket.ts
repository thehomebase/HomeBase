import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import { pool } from './db';
import { log } from './vite';
import { storage } from './storage';

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

class TransactionLockManager {
  private locks = new Map<number, LockInfo>();
  private readonly timeoutMs: number;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(timeoutMs = 5 * 60 * 1000) {
    this.timeoutMs = timeoutMs;
    this.cleanupTimer = setInterval(() => this.cleanupExpiredLocks(), 30_000);
  }

  acquireLock(txId: number, userId: number, userName: string, userRole: string, ws: WebSocket): { acquired: boolean; holder?: LockInfo } {
    const existing = this.locks.get(txId);
    if (existing && existing.userId !== userId && existing.ws.readyState === WebSocket.OPEN) {
      return { acquired: false, holder: existing };
    }
    const lockInfo: LockInfo = { userId, userName, userRole, ws, lastHeartbeat: Date.now() };
    this.locks.set(txId, lockInfo);
    return { acquired: true, holder: lockInfo };
  }

  releaseLock(txId: number, userId: number, ws: WebSocket): boolean {
    const lock = this.locks.get(txId);
    if (lock && lock.userId === userId && lock.ws === ws) {
      this.locks.delete(txId);
      return true;
    }
    return false;
  }

  getLockHolder(txId: number): LockInfo | undefined {
    const lock = this.locks.get(txId);
    if (lock && lock.ws.readyState !== WebSocket.OPEN) {
      this.locks.delete(txId);
      return undefined;
    }
    return lock;
  }

  heartbeat(txId: number, userId: number): void {
    const lock = this.locks.get(txId);
    if (lock && lock.userId === userId) {
      lock.lastHeartbeat = Date.now();
    }
  }

  releaseAllForSocket(ws: WebSocket): number[] {
    const released: number[] = [];
    for (const [txId, lock] of this.locks) {
      if (lock.ws === ws) {
        this.locks.delete(txId);
        released.push(txId);
      }
    }
    return released;
  }

  private cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [txId, lock] of this.locks) {
      if (now - lock.lastHeartbeat > this.timeoutMs) {
        this.locks.delete(txId);
        broadcastTransactionUnlocked(txId);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}

const lockManager = new TransactionLockManager();

async function verifyTransactionAccessForWs(transactionId: number, userId: number, userRole: string): Promise<boolean> {
  try {
    const transaction = await storage.getTransaction(transactionId);
    if (!transaction) return false;
    if (transaction.agentId === userId) return true;
    if (userRole === 'broker') return true;
    if (transaction.clientId) {
      const client = await storage.getClient(transaction.clientId);
      if (client?.linkedClientId === userId) return true;
    }
    if (transaction.secondaryClientId) {
      const secondaryClient = await storage.getClient(transaction.secondaryClientId);
      if (secondaryClient?.linkedClientId === userId) return true;
    }
    const authResult = await pool.query(
      `SELECT permission_level FROM authorized_users WHERE authorized_user_id = $1 AND owner_id = $2 AND status = 'active' LIMIT 1`,
      [userId, transaction.agentId]
    );
    if (authResult.rows.length > 0) return true;
    return false;
  } catch {
    return false;
  }
}

async function broadcastTransactionLocked(txId: number, lock: LockInfo) {
  const message = JSON.stringify({
    type: 'transaction:locked',
    payload: {
      transactionId: txId,
      lockedBy: { userId: lock.userId, name: lock.userName, role: lock.userRole },
    },
  });
  for (const [userId, connections] of userConnections) {
    if (userId === lock.userId) continue;
    const firstWs = connections.values().next().value;
    const role = firstWs ? (firstWs as any).userRole || 'user' : 'user';
    const hasAccess = await verifyTransactionAccessForWs(txId, userId, role);
    if (!hasAccess) continue;
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }
}

async function broadcastTransactionUnlocked(txId: number) {
  const message = JSON.stringify({
    type: 'transaction:unlocked',
    payload: { transactionId: txId },
  });
  for (const [userId, connections] of userConnections) {
    const firstWs = connections.values().next().value;
    const role = firstWs ? (firstWs as any).userRole || 'user' : 'user';
    const hasAccess = await verifyTransactionAccessForWs(txId, userId, role);
    if (!hasAccess) continue;
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }
}

async function handleLockMessage(ws: WebSocket, userId: number, userRole: string, data: any) {
  const { type, payload } = data;
  const rawTxId = payload?.transactionId;
  if (!rawTxId) return;
  const txId = typeof rawTxId === 'string' ? parseInt(rawTxId, 10) : rawTxId;
  if (!Number.isFinite(txId) || txId <= 0) return;

  if (type === 'transaction:lock' || type === 'transaction:query_lock') {
    const hasAccess = await verifyTransactionAccessForWs(txId, userId, userRole);
    if (!hasAccess) {
      ws.send(JSON.stringify({ type: 'transaction:error', payload: { transactionId: txId, error: 'Access denied' } }));
      return;
    }
  }

  switch (type) {
    case 'transaction:lock': {
      const result = lockManager.acquireLock(txId, userId, payload.userName || 'Unknown', payload.userRole || 'user', ws);
      if (!result.acquired && result.holder) {
        ws.send(JSON.stringify({
          type: 'transaction:locked',
          payload: {
            transactionId: txId,
            lockedBy: { userId: result.holder.userId, name: result.holder.userName, role: result.holder.userRole },
          },
        }));
      } else if (result.acquired && result.holder) {
        ws.send(JSON.stringify({
          type: 'transaction:lock_acquired',
          payload: { transactionId: txId },
        }));
        broadcastTransactionLocked(txId, result.holder);
      }
      break;
    }
    case 'transaction:unlock': {
      const released = lockManager.releaseLock(txId, userId, ws);
      if (released) {
        broadcastTransactionUnlocked(txId);
      }
      break;
    }
    case 'transaction:heartbeat': {
      lockManager.heartbeat(txId, userId);
      break;
    }
    case 'transaction:query_lock': {
      const holder = lockManager.getLockHolder(txId);
      if (holder && holder.userId !== userId) {
        ws.send(JSON.stringify({
          type: 'transaction:locked',
          payload: {
            transactionId: txId,
            lockedBy: { userId: holder.userId, name: holder.userName, role: holder.userRole },
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

let wss: WebSocketServer;

export function setupWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);

    if (url.pathname === '/ws') {
      authenticateWebSocket(request)
        .then((authInfo) => {
          if (!authInfo) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          wss.handleUpgrade(request, socket, head, (ws) => {
            (ws as any).userId = authInfo.userId;
            (ws as any).userRole = authInfo.userRole;
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
    const userRole = (ws as any).userRole as string;

    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(ws);

    ws.send(JSON.stringify({ type: 'connected', payload: { userId } }));

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (typeof data.type === 'string' && data.type.startsWith('transaction:')) {
          handleLockMessage(ws, userId, userRole, data);
        }
      } catch {}
    });

    ws.on('close', () => {
      const releasedTxIds = lockManager.releaseAllForSocket(ws);
      for (const txId of releasedTxIds) {
        broadcastTransactionUnlocked(txId);
      }
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

async function authenticateWebSocket(request: IncomingMessage): Promise<{ userId: number; userRole: string } | null> {
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
      const userId = passportData.passport.user;
      const user = await storage.getUser(userId);
      return user ? { userId, userRole: user.role } : null;
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
