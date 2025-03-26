import { useEffect, useState } from 'react';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

/**
 * FileChangeDetector component monitors for hot module replacement updates
 * and provides visual feedback when code changes are detected.
 */
export const FileChangeDetector: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!import.meta.hot) return;

    // Track when updates occur
    const handleUpdate = (payload: any) => {
      console.log('Change detected in files:', payload);
      setLastUpdate(Date.now());
      
      // Show toast notification for file changes
      toast({
        title: 'Code Changes Detected',
        description: `Updated ${Array.isArray(payload.updates) ? payload.updates.length : 0} modules`,
        variant: 'default',
      });
    };

    // Listen for update events
    import.meta.hot.on('vite:beforeUpdate', handleUpdate);

    return () => {
      // Clean up event listener
      if (import.meta.hot) {
        import.meta.hot.off('vite:beforeUpdate', handleUpdate);
      }
    };
  }, [toast]);

  return null; // This component doesn't render anything visual
};

export default FileChangeDetector;