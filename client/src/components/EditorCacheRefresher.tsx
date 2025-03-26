import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * EditorCacheRefresher - A component to help fix editor cache issues
 * This displays a button that forces the editor to reload files from disk
 */
export function EditorCacheRefresher() {
  const { toast } = useToast();

  // Function to force refresh the editor cache
  const refreshEditorCache = () => {
    try {
      // Attempt to send a message to the editor via the Replit API if available
      if (window.replit && typeof window.replit.refreshFiles === 'function') {
        window.replit.refreshFiles();
        toast({
          title: "Editor refresh requested",
          description: "The Replit editor has been asked to reload files from disk.",
        });
      } else {
        // Fallback for when the Replit API is not available
        fetch('/api/refreshEditorCache', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: Date.now() })
        })
        .then(() => {
          toast({
            title: "Editor refresh signal sent",
            description: "Try closing and reopening any files that appear out of sync.",
          });
        })
        .catch(() => {
          toast({
            title: "Editor refresh failed",
            description: "Please manually close and reopen your files to refresh the editor.",
            variant: "destructive"
          });
        });
      }
    } catch (error) {
      console.error("Error refreshing editor cache:", error);
      toast({
        title: "Editor refresh error",
        description: "Please manually close and reopen your files to refresh the editor.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={refreshEditorCache}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Refresh Editor</span>
      </Button>
    </div>
  );
}

// Add TypeScript declaration for Replit API
declare global {
  interface Window {
    replit?: {
      refreshFiles?: () => void;
    };
  }
}

export default EditorCacheRefresher;