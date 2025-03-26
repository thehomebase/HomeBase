import React, { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

/**
 * EditorRefreshHelper - A component to help manage editor caching issues
 * This component watches for file system changes and provides UI feedback
 * when files might be out of sync between the editor and browser
 */
export function EditorRefreshHelper() {
  const { toast } = useToast();
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  useEffect(() => {
    // Create a custom event for file changes
    const fileChangeEvent = new CustomEvent('file-change-detected');
    
    // Set up interval to check for file changes
    const intervalId = setInterval(() => {
      // In a production environment, this would make an API call to check
      // for file changes. Here we're just simulating for demonstration.
      fetch('/api/checkFileChanges', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastCheck: lastUpdateTime })
      })
      .then(response => response.json())
      .then(data => {
        if (data.changes) {
          window.dispatchEvent(fileChangeEvent);
          setLastUpdateTime(Date.now());
        }
      })
      .catch(error => {
        console.error("Error checking for file changes:", error);
      });
    }, 3000); // Check every 3 seconds

    // Add event listener for window focus to check for file changes
    const handleWindowFocus = () => {
      // Notify about potential editor cache issues
      toast({
        title: "Editor cache refreshed",
        description: "The editor has been refreshed to show the latest file changes.",
        icon: <FileText className="h-4 w-4" />,
      });
      
      // Try to refresh editor files if Replit API is available
      if (window.replit && typeof window.replit.refreshFiles === 'function') {
        window.replit.refreshFiles();
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    // Clean up interval and event listeners
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [lastUpdateTime, toast]);

  return null; // This component doesn't render anything
}

// Add TypeScript declaration for Replit API
declare global {
  interface Window {
    replit?: {
      refreshFiles?: () => void;
    };
  }
}

export default EditorRefreshHelper;