
import { useEffect, useState } from 'react';

export function useDeviceSize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (width < 360) return 'mobile-xs';
  if (width < 375) return 'mobile-sm';
  if (width < 390) return 'mobile-md';
  if (width < 430) return 'mobile-lg';
  if (width < 600) return 'tablet-sm';
  if (width < 768) return 'tablet-md';
  return 'desktop';
}
