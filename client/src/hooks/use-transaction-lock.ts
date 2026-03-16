import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "./use-websocket";
import { useAuth } from "./use-auth";

interface LockHolder {
  userId: number;
  name: string;
  role: string;
}

interface TransactionLockState {
  isLocked: boolean;
  lockedBy: LockHolder | null;
  isReadOnly: boolean;
  hasLock: boolean;
}

const HEARTBEAT_INTERVAL_MS = 60_000;

export function useTransactionLock(transactionId: number | null): TransactionLockState {
  const { connected, on, send } = useWebSocket();
  const { user } = useAuth();
  const [lockedBy, setLockedBy] = useState<LockHolder | null>(null);
  const [hasLock, setHasLock] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const txIdRef = useRef(transactionId);
  txIdRef.current = transactionId;

  useEffect(() => {
    if (!transactionId || !connected || !user) return;

    const unsubLocked = on('transaction:locked', (event) => {
      if (event.payload.transactionId === transactionId) {
        setLockedBy(event.payload.lockedBy);
        setHasLock(false);
      }
    });

    const unsubUnlocked = on('transaction:unlocked', (event) => {
      if (event.payload.transactionId === transactionId) {
        setLockedBy(null);
        setHasLock(false);
        send('transaction:lock', {
          transactionId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userRole: user.role,
        });
      }
    });

    const unsubAcquired = on('transaction:lock_acquired', (event) => {
      if (event.payload.transactionId === transactionId) {
        setHasLock(true);
        setLockedBy(null);
      }
    });

    send('transaction:lock', {
      transactionId,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      userRole: user.role,
    });

    heartbeatRef.current = setInterval(() => {
      if (txIdRef.current) {
        send('transaction:heartbeat', { transactionId: txIdRef.current });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      unsubLocked();
      unsubUnlocked();
      unsubAcquired();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      send('transaction:unlock', { transactionId });
      setLockedBy(null);
      setHasLock(false);
    };
  }, [transactionId, connected, user, on, send]);

  useEffect(() => {
    if (!transactionId) return;
    const handleBeforeUnload = () => {
      send('transaction:unlock', { transactionId });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [transactionId, send]);

  const isLocked = !!lockedBy;
  const isReadOnly = isLocked && lockedBy?.userId !== user?.id;

  return { isLocked, lockedBy, isReadOnly, hasLock };
}
