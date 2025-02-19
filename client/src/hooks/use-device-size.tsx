
import { useEffect, useState } from 'react';

export function useDeviceSize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (width < 375) return 'mobile-sm';     // Smaller phones
  if (width < 480) return 'mobile-lg';     // Larger phones
  if (width < 768) return 'tablet';        // Tablets
  if (width < 1024) return 'laptop';       // Small laptops
  return 'desktop';                        // Larger screens
}
