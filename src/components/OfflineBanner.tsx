import React, { useEffect, useState } from 'react';
import { WifiOff, MicOff, RefreshCw } from 'lucide-react';
import { sfx } from '../utils/audio';

interface OfflineBannerProps {
  micDenied?: boolean;
  onRetryMic?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ micDenied = false, onRetryMic }) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (isOnline && !micDenied) return null;

  return (
    <div className="w-full bg-amber-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 shadow-md flex items-center justify-between gap-3 z-50">
      {!isOnline ? (
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <WifiOff className="w-5 h-5 shrink-0 text-amber-200" />
          <span>
            No internet connection detected. You can still practice reading and speaking locally!
          </span>
        </div>
      ) : micDenied ? (
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <MicOff className="w-5 h-5 shrink-0 text-rose-200" />
            <span>
              Microphone access needed for voice reading & speaking. Please click the mic icon in your browser address bar to allow!
            </span>
          </div>
          {onRetryMic && (
            <button
              onClick={() => {
                sfx.playPop();
                onRetryMic();
              }}
              className="px-3 py-1 bg-white text-amber-900 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-amber-100 transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Mic
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
