import React, { useEffect, useState } from 'react';

/**
 * A simple component to help test and demonstrate 
 * Hot Module Replacement (HMR) functionality.
 */
export function HmrTrigger() {
  const [timestamp, setTimestamp] = useState(new Date());
  
  // Update the timestamp every 5 seconds to demonstrate component updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-yellow-100 dark:bg-yellow-800 p-2 rounded-md shadow-md text-xs">
      <p>HMR Test Component</p>
      <p>Current time: {timestamp.toLocaleTimeString()}</p>
      <p className="text-orange-600 dark:text-orange-400">Version: 1.3 (HMR is now fully enabled and working!)</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Try editing this component to see HMR in action
      </p>
    </div>
  );
}

export default HmrTrigger;