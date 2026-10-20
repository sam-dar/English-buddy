import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2, Mic, Heart } from 'lucide-react';
import { sfx, speakText } from '../utils/audio';

export type MascotMood = 'idle' | 'listening' | 'talking' | 'celebrating' | 'thinking' | 'encouraging';

interface MascotProps {
  mood?: MascotMood;
  speechBubble?: string | null;
  size?: 'sm' | 'md' | 'lg';
  tier?: 'Basic' | 'Intermediate' | 'Advanced';
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  mood = 'idle',
  speechBubble = null,
  size = 'md',
  tier = 'Basic',
  className = '',
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [tapBubble, setTapBubble] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
  };

  const handleMascotTap = () => {
    sfx.playPop();
    const quotes = [
      "You're a superstar!",
      "I believe in you, buddy!",
      "You have such a clear voice!",
      "Learning English is an awesome adventure!",
      "High five! Let's keep exploring!",
    ];
    const picked = quotes[clickCount % quotes.length];
    setTapBubble(picked);
    setClickCount((c) => c + 1);
    speakText(picked, undefined, () => {
      setTimeout(() => setTapBubble(null), 2500);
    }, tier);
  };

  const activeBubble = tapBubble || speechBubble;

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Speech Bubble */}
      <AnimatePresence>
        {activeBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="mb-2 max-w-xs md:max-w-sm px-4 py-2.5 bg-white border-2 border-amber-300 rounded-2xl shadow-lg text-amber-950 text-sm md:text-base font-medium relative text-center z-10"
          >
            {activeBubble}
            {/* Bubble arrow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-amber-300 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Character (Barnaby the Bear) */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleMascotTap}
        className={`cursor-pointer relative ${sizeClasses[size]} flex items-center justify-center`}
        title="Tap me to chat!"
      >
        {/* Glow halo when listening or celebrating */}
        {mood === 'listening' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="absolute inset-0 rounded-full bg-emerald-400 blur-xl -z-10"
          />
        )}
        {mood === 'celebrating' && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute inset-0 rounded-full bg-amber-400 blur-xl -z-10"
          />
        )}

        {/* Mascot SVG Character */}
        <motion.svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-md"
          animate={
            mood === 'listening'
              ? { rotate: [-2, 2, -2], y: [0, -3, 0] }
              : mood === 'talking'
              ? { y: [0, -4, 0, -2, 0] }
              : mood === 'celebrating'
              ? { y: [0, -10, 0, -6, 0], rotate: [-4, 4, -4, 0] }
              : mood === 'thinking'
              ? { rotate: [0, 5, 5, 0] }
              : { y: [0, -2, 0] }
          }
          transition={{
            repeat: Infinity,
            duration: mood === 'celebrating' ? 0.9 : mood === 'talking' ? 0.6 : 2.5,
            ease: 'easeInOut',
          }}
        >
          {/* Bear Ears */}
          <circle cx="42" cy="46" r="22" fill="#D97706" />
          <circle cx="42" cy="46" r="14" fill="#FDE68A" />
          <circle cx="118" cy="46" r="22" fill="#D97706" />
          <circle cx="118" cy="46" r="14" fill="#FDE68A" />

          {/* Bear Head */}
          <circle cx="80" cy="85" r="54" fill="#F59E0B" />

          {/* Cheeks */}
          <circle cx="52" cy="98" r="9" fill="#FCA5A5" opacity="0.6" />
          <circle cx="108" cy="98" r="9" fill="#FCA5A5" opacity="0.6" />

          {/* Snout */}
          <ellipse cx="80" cy="98" rx="26" ry="20" fill="#FEF3C7" />

          {/* Nose */}
          <path d="M74 88 Q80 84 86 88 Q80 95 74 88 Z" fill="#78350F" />

          {/* Eyes */}
          {mood === 'celebrating' ? (
            // Happy closed crescent eyes
            <g stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M54 75 Q62 67 70 75" />
              <path d="M90 75 Q98 67 106 75" />
            </g>
          ) : mood === 'thinking' ? (
            // Looking up-right curious eyes
            <g fill="#78350F">
              <circle cx="62" cy="73" r="5" />
              <circle cx="100" cy="73" r="5" />
              <circle cx="64" cy="71" r="2" fill="#FFFFFF" />
              <circle cx="102" cy="71" r="2" fill="#FFFFFF" />
            </g>
          ) : (
            // Friendly open bright eyes
            <g fill="#78350F">
              <circle cx="60" cy="75" r="6" />
              <circle cx="100" cy="75" r="6" />
              <circle cx="58" cy="73" r="2.5" fill="#FFFFFF" />
              <circle cx="98" cy="73" r="2.5" fill="#FFFFFF" />
            </g>
          )}

          {/* Mouth */}
          {mood === 'talking' ? (
            <motion.ellipse
              cx="80"
              cy="106"
              rx="9"
              ry="7"
              fill="#991B1B"
              animate={{ ry: [3, 8, 4, 8, 3] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            />
          ) : mood === 'celebrating' ? (
            <path
              d="M70 102 Q80 116 90 102"
              fill="#991B1B"
              stroke="#78350F"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M72 102 Q80 110 88 102"
              fill="none"
              stroke="#78350F"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Cute IELTS Student Graduation / Explorer Scout Badge Hat */}
          <g transform="translate(56, 12)">
            <ellipse cx="24" cy="22" rx="28" ry="8" fill="#3B82F6" />
            <polygon points="24,2 4,14 44,14" fill="#2563EB" />
            <circle cx="24" cy="2" r="3" fill="#FBBF24" />
          </g>
        </motion.svg>

        {/* State Badge Icon Overlay */}
        <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white shadow border border-amber-200">
          {mood === 'listening' && <Mic className="w-4 h-4 text-emerald-600 animate-pulse" />}
          {mood === 'talking' && <Volume2 className="w-4 h-4 text-blue-600 animate-bounce" />}
          {mood === 'celebrating' && <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />}
          {mood === 'thinking' && <Heart className="w-4 h-4 text-rose-500" />}
          {mood === 'idle' && <Sparkles className="w-4 h-4 text-amber-400" />}
        </div>
      </motion.div>
    </div>
  );
};
