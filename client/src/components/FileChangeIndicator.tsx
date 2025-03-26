import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * FileChangeIndicator provides a more noticeable visual indicator
 * when files change in the project, making HMR events obvious to users.
 */
export function FileChangeIndicator() {
  const [visible, setVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (!import.meta.hot) return;

    const handleUpdate = () => {
      const now = new Date().toLocaleTimeString();
      setLastUpdate(now);
      setVisible(true);
      
      // Hide after 5 seconds
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    };

    // Register for hmr updates
    import.meta.hot.on('vite:beforeUpdate', handleUpdate);

    // Also listen for custom file change events from FileChangeDetector
    window.addEventListener('file-change', () => {
      handleUpdate();
    });

    return () => {
      window.removeEventListener('file-change', handleUpdate);
      // No need to unregister the import.meta.hot handlers as they're automatically cleaned up
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-50 bg-blue-100 dark:bg-blue-800 p-3 rounded-md shadow-lg"
        >
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400 animate-spin" />
            <div>
              <p className="font-medium">Hot Module Replacement Active</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Code updated at {lastUpdate}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FileChangeIndicator;