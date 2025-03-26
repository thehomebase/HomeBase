import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HmrStatusProps {
  className?: string;
}

type StatusType = 'idle' | 'connecting' | 'connected' | 'updating' | 'error' | 'disconnected';

/**
 * HmrStatus component displays a visual indicator of the HMR (Hot Module Replacement) connection status.
 * It provides real-time feedback when changes are detected in the codebase.
 */
export function HmrStatus({ className = '' }: HmrStatusProps) {
  const [status, setStatus] = useState<StatusType>('connecting');
  const [message, setMessage] = useState<string>('Connecting to HMR...');
  const [visible, setVisible] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    if (!import.meta.hot) return;

    // Check if already connected
    if (import.meta.hot.data && import.meta.hot.data.connected) {
      console.log('Already connected to HMR');
      setStatus('connected');
      setMessage('HMR connected');
      setVisible(true);
      setTimeout(() => setVisible(false), 2000);
    }

    const handleConnect = () => {
      console.log('HMR WebSocket connected');
      setStatus('connected');
      setMessage('HMR connected');
      setVisible(true);
      setTimeout(() => setVisible(false), 2000);
    };

    const handleDisconnect = () => {
      console.log('HMR WebSocket disconnected');
      setStatus('disconnected');
      setMessage('Connection lost - reconnecting');
      setVisible(true);
    };

    const handleUpdate = (payload: any) => {
      console.log('HMR update detected', payload);
      const updatedFiles = Array.isArray(payload.updates) 
        ? payload.updates.map((u: any) => u.path || u.acceptedPath || '').filter(Boolean)
        : [];
      
      const fileNames = updatedFiles.map((path: string) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
      });
      
      setStatus('updating');
      setMessage(`Updating ${fileNames.length ? fileNames.join(', ') : 'files'}`);
      setLastUpdate(Date.now());
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    };

    const handleError = (payload: any) => {
      console.error('HMR error:', payload);
      setStatus('error');
      setMessage('HMR error - check console');
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    };

    // Register event handlers
    import.meta.hot.on('vite:ws-connect', handleConnect);
    import.meta.hot.on('vite:ws-disconnect', handleDisconnect);
    import.meta.hot.on('vite:beforeUpdate', handleUpdate);
    import.meta.hot.on('vite:error', handleError);

    // Force connection check
    window.addEventListener('hmr-status-change', ((e: CustomEvent) => {
      console.log('HMR status change event received', e.detail);
      if (e.detail.status === 'connected') {
        setStatus('connected');
        setMessage('HMR connected');
        setVisible(true);
        setTimeout(() => setVisible(false), 2000);
      } else if (e.detail.status === 'disconnected') {
        setStatus('disconnected');
        setMessage('Connection lost - reconnecting');
        setVisible(true);
      } else if (e.detail.status === 'error') {
        setStatus('error');
        setMessage(`HMR error: ${e.detail.error || 'check console'}`);
        setVisible(true);
        setTimeout(() => setVisible(false), 5000);
      }
    }) as EventListener);

    // Auto-hide connecting message after a timeout
    const timer = setTimeout(() => {
      if (status === 'connecting') {
        setStatus('connected');
        setMessage('HMR ready');
        setVisible(true);
        setTimeout(() => setVisible(false), 2000);
      }
    }, 5000);

    return () => {
      // Clean up event handlers
      if (import.meta.hot) {
        import.meta.hot.off('vite:ws-connect', handleConnect);
        import.meta.hot.off('vite:ws-disconnect', handleDisconnect);
        import.meta.hot.off('vite:beforeUpdate', handleUpdate);
        import.meta.hot.off('vite:error', handleError);
      }
      window.removeEventListener('hmr-status-change', ((e: CustomEvent) => {}) as EventListener);
      clearTimeout(timer);
    };
  }, [status]);

  // Status styles and icons
  const statusColors = {
    idle: 'bg-gray-200 text-gray-700',
    connecting: 'bg-blue-100 text-blue-700',
    connected: 'bg-green-100 text-green-700',
    updating: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    disconnected: 'bg-orange-100 text-orange-700',
  };

  const statusIcons = {
    idle: <div className="w-4 h-4" />,
    connecting: <RefreshCw className="w-4 h-4 animate-spin" />,
    connected: <CheckCircle className="w-4 h-4" />,
    updating: <RefreshCw className="w-4 h-4 animate-spin" />,
    error: <AlertCircle className="w-4 h-4" />,
    disconnected: <AlertCircle className="w-4 h-4" />,
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-4 right-4 z-50 ${className}`}
        >
          <div className={`flex items-center space-x-2 rounded-md px-3 py-2 shadow-md ${statusColors[status]}`}>
            <span>{statusIcons[status]}</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default HmrStatus;