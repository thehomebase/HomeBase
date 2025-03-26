import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";

/**
 * EditorRefreshHelper - A component to help manage editor caching issues
 * This component watches for file system changes and provides UI feedback
 * when files might be out of sync between the editor and browser
 */
export function EditorRefreshHelper() {
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  useEffect(() => {
    // Handler for file system change events
    const handleFileChange = (event: CustomEvent) => {
      const now = Date.now();
      
      // Only show notification if sufficient time has passed since last one
      if (now - lastRefresh > 10000) { // 10 seconds
        setLastRefresh(now);
        
        toast({
          title: "File System Change Detected",
          description: "If editor files appear out of sync, close and reopen them.",
          duration: 5000,
        });
      }
    };
    
    // Add event listener for file system changes
    window.addEventListener('file-system-change', handleFileChange as EventListener);
    
    // Also listen for HMR updates
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', (payload: any) => {
        // Track when HMR updates occur
        const now = Date.now();
        if (now - lastRefresh > 10000) {
          setLastRefresh(now);
        }
      });
    }
    
    return () => {
      // Remove event listener when component unmounts
      window.removeEventListener('file-system-change', handleFileChange as EventListener);
    };
  }, [lastRefresh, toast]);
  
  // This component doesn't render anything visible
  return null;
}

export default EditorRefreshHelper;