import React, { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { RefreshCcw } from 'lucide-react';

/**
 * FileChangeDetector component monitors for hot module replacement updates
 * and provides visual feedback when code changes are detected.
 */
export const FileChangeDetector: React.FC = () => {
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [updatedFiles, setUpdatedFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!import.meta.hot) return;

    // Function to handle file updates
    const handleBeforeUpdate = (payload: any) => {
      console.log('File changes detected:', payload);
      
      // Extract updated file names from the payload
      const files: string[] = Array.isArray(payload.updates) 
        ? payload.updates.map((u: any) => {
            const path = u.path || u.acceptedPath || '';
            if (!path) return '';
            const parts = path.split('/');
            return parts[parts.length - 1];
          }).filter(Boolean)
        : [];
      
      if (files.length > 0) {
        setUpdatedFiles(files);
        setLastUpdateTime(Date.now());
        
        // Show a toast notification for the file changes
        toast({
          title: 'Code changes detected',
          description: (
            <div className="flex flex-col">
              <span>The following files were updated:</span>
              <ul className="list-disc pl-4 mt-1">
                {files.slice(0, 3).map((file: string, i: number) => (
                  <li key={i} className="text-xs">{file}</li>
                ))}
                {files.length > 3 && <li className="text-xs">...and {files.length - 3} more</li>}
              </ul>
            </div>
          ),
          action: (
            <div
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reload
            </div>
          ),
        });
      }
    };

    // Register for HMR updates
    import.meta.hot.on('vite:beforeUpdate', handleBeforeUpdate);

    return () => {
      if (import.meta.hot) {
        import.meta.hot.off('vite:beforeUpdate', handleBeforeUpdate);
      }
    };
  }, []);

  // Also listen for file changes via a custom event that could be triggered by external tools
  useEffect(() => {
    const handleFileChange = (event: CustomEvent) => {
      const { filePath } = event.detail;
      if (filePath) {
        const fileName = filePath.split('/').pop();
        setUpdatedFiles([fileName]);
        setLastUpdateTime(Date.now());
        
        toast({
          title: 'External file change detected',
          description: `The file ${fileName} was modified outside of the editor`,
          action: (
            <div
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reload
            </div>
          ),
        });
      }
    };

    window.addEventListener('file-change' as any, handleFileChange);
    return () => {
      window.removeEventListener('file-change' as any, handleFileChange);
    };
  }, []);

  return null; // This component doesn't render anything visible
};

export default FileChangeDetector;