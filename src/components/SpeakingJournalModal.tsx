import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  Mic,
  Clock,
  Sparkles,
  Volume2,
  CheckCircle2,
  Calendar,
  BookMarked,
  Heart,
  RotateCcw,
  Plus,
  Smile,
  Award,
} from 'lucide-react';
import { DifficultyTier, SpeakingJournalEntry, JournalPrompt } from '../types';
import { Mascot } from './Mascot';
import { speakText, stopCurrentAudio, sfx, createSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/audio';

const JOURNAL_PROMPTS: JournalPrompt[] = [
  {
    id: 'jp-happy',
    emoji: '☀️',
    question: 'What was the happiest part of your day today?',
    starter: 'Today, the happiest part was...',
  },
  {
    id: 'jp-food',
    emoji: '🍕',
    question: 'What delicious food or treat did you eat today?',
    starter: 'Today, for lunch or snack, I ate...',
  },
  {
    id: 'jp-play',
    emoji: '⚽',
    question: 'What fun game did you play with family or friends?',
    starter: 'Today, I had fun playing...',
  },
  {
    id: 'jp-learn',
    emoji: '🎒',
    question: 'What is something interesting you learned or saw today?',
    starter: 'Today, I learned about...',
  },
  {
    id: 'jp-free',
    emoji: '🌈',
    question: 'Free Talk: Tell Barnaby anything on your mind!',
    starter: 'Hello Barnaby, today I want to tell you that...',
  },
];

const INITIAL_SAMPLE_ENTRIES: SpeakingJournalEntry[] = [
  {
    id: 'entry-yesterday',
    date: 'Yesterday',
    prompt: 'What fun game did you play with family or friends?',
    transcript: 'I went to the playground with my cousin and we raced on the green scooters. I was super fast and we laughed!',
    durationSeconds: 22,
    journalTitle: 'Super Fast Scooter Race!',
    moodEmoji: '🛴',
    gentleResponse:
      'Racing scooters on a sunny day sounds like a blast! You spoke with so much excitement and happiness. You are doing a stellar job practicing your English daily!',
    encouragementHighlight: 'Spoke for 22 seconds with vivid storytelling!',
    celebrationBadge: 'Speedy Storyteller',
  },
];

interface SpeakingJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: DifficultyTier;
  onAddPoints: (points: number) => void;
}

export const SpeakingJournalModal: React.FC<SpeakingJournalModalProps> = ({
  isOpen,
  onClose,
  tier,
  onAddPoints,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'entries'>('record');
  const [selectedPrompt, setSelectedPrompt] = useState<JournalPrompt>(JOURNAL_PROMPTS[0]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<SpeakingJournalEntry | null>(null);

  // Saved Entries List
  const [entries, setEntries] = useState<SpeakingJournalEntry[]>(INITIAL_SAMPLE_ENTRIES);

  const timerRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      clearInterval(timerRef.current);
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  // Start 30-second recording
  const handleStartRecording = () => {
    sfx.playPop();
    setIsRecording(true);
    setSecondsRemaining(30);
    setTranscript('');
    setCurrentResponse(null);

    // 30-second countdown timer
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleStopAndSubmit(30);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (!isSpeechRecognitionSupported()) return;

    const recognizer = createSpeechRecognizer(
      (text) => {
        setTranscript(text);
      },
      (err) => {
        console.warn('Journal speech error:', err);
      },
      () => {
        // Recognition cycle completed
      }
    );

    recognizerRef.current = recognizer;
    try {
      recognizer?.start();
    } catch {}
  };

  // Stop recording manually
  const handleStopAndSubmit = async (forcedDuration?: number) => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    sfx.playDing();

    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
    }

    const duration = forcedDuration !== undefined ? forcedDuration : 30 - secondsRemaining;
    const finalDuration = Math.max(5, duration);
    const spokenText = transcript.trim() || `${selectedPrompt.starter} I had a wonderful day playing and learning!`;

    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/speaking-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: spokenText,
          promptText: selectedPrompt.question,
          tier,
          durationSeconds: finalDuration,
        }),
      });

      const data = await res.json();

      const newEntry: SpeakingJournalEntry = {
        id: `entry-${Date.now()}`,
        date: 'Today',
        prompt: selectedPrompt.question,
        transcript: spokenText,
        durationSeconds: finalDuration,
        journalTitle: data.journalTitle || 'My Cheerful Daily Entry',
        moodEmoji: data.moodEmoji || '🌟',
        gentleResponse:
          data.gentleResponse ||
          "I loved hearing about your day! You spoke with so much heart and confidence.",
        encouragementHighlight:
          data.encouragementHighlight || `You spoke for ${finalDuration} seconds! Wonderful habit!`,
        celebrationBadge: data.celebrationBadge || 'Daily Speaker Star',
      };

      setCurrentResponse(newEntry);
      setEntries((prev) => [newEntry, ...prev]);

      // Award bonus points & confetti
      sfx.playFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      onAddPoints(40);

      // Auto-narrate Barnaby's gentle response!
      speakText(newEntry.gentleResponse, undefined, undefined, tier);
    } catch (err) {
      console.error('Speaking journal error:', err);
      const fallbackEntry: SpeakingJournalEntry = {
        id: `entry-${Date.now()}`,
        date: 'Today',
        prompt: selectedPrompt.question,
        transcript: spokenText,
        durationSeconds: finalDuration,
        journalTitle: 'My Wonderful Check-In',
        moodEmoji: '💖',
        gentleResponse:
          'Thank you so much for sharing your day with me! You have such a bright, friendly voice. Keep up your daily speaking habit!',
        encouragementHighlight: 'Great job speaking English today!',
        celebrationBadge: 'Daily Speaker Star',
      };
      setCurrentResponse(fallbackEntry);
      setEntries((prev) => [fallbackEntry, ...prev]);
      onAddPoints(40);
      speakText(fallbackEntry.gentleResponse, undefined, undefined, tier);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleHearResponse = (text: string) => {
    sfx.playPop();
    speakText(text, undefined, undefined, tier);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl bg-linear-to-b from-rose-50/90 via-white to-purple-50/80 border-4 border-rose-300 rounded-3xl shadow-2xl p-5 sm:p-7 relative overflow-hidden text-slate-800 max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 transition"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-rose-100 border-2 border-rose-300 rounded-2xl text-rose-600">
            <BookMarked className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-rose-950 font-['Fredoka']">
                Speaking Journal
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-200 text-rose-900">
                Daily Check-In
              </span>
            </div>
            <p className="text-xs text-rose-800 font-medium">
              Record a 30-second daily check-in. Barnaby listens and gives you gentle, caring feedback!
            </p>
          </div>
        </div>

        {/* Tabs: Record New vs Past Entries */}
        <div className="flex p-1 bg-rose-100/70 rounded-2xl mb-4 border border-rose-200 shrink-0">
          <button
            onClick={() => {
              sfx.playPop();
              setActiveTab('record');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'record'
                ? 'bg-white text-rose-900 shadow-xs'
                : 'text-rose-700 hover:text-rose-950'
            }`}
          >
            <Mic className="w-4 h-4 text-rose-500" />
            Record Today's Check-in
          </button>
          <button
            onClick={() => {
              sfx.playPop();
              setActiveTab('entries');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'entries'
                ? 'bg-white text-rose-900 shadow-xs'
                : 'text-rose-700 hover:text-rose-950'
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-500" />
            My Journal Diary ({entries.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'record' ? (
            <div className="space-y-4">
              {/* Not recording & No active response: Pick Prompt & Start */}
              {!isRecording && !isAnalyzing && !currentResponse && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Choose Today's Check-In Question:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {JOURNAL_PROMPTS.map((prompt) => (
                        <button
                          key={prompt.id}
                          onClick={() => {
                            sfx.playPop();
                            setSelectedPrompt(prompt);
                          }}
                          className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-2.5 ${
                            selectedPrompt.id === prompt.id
                              ? 'bg-rose-50 border-rose-400 shadow-xs text-rose-950 font-bold'
                              : 'bg-white border-slate-200 hover:border-rose-200 text-slate-700 font-medium'
                          }`}
                        >
                          <span className="text-2xl shrink-0">{prompt.emoji}</span>
                          <div className="text-xs leading-snug">
                            {prompt.question}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Card with Starter Helper */}
                  <div className="p-4 rounded-2xl bg-white border-2 border-rose-200 shadow-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{selectedPrompt.emoji}</span>
                      <h3 className="text-sm font-black text-rose-950 font-['Fredoka']">
                        {selectedPrompt.question}
                      </h3>
                    </div>
                    <p className="text-xs text-rose-800 italic bg-rose-50 p-2 rounded-xl mt-2">
                      💡 Sentence Starter: "{selectedPrompt.starter}"
                    </p>
                  </div>

                  {/* Big Record Button */}
                  <button
                    onClick={handleStartRecording}
                    className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-lg shadow-xl flex items-center justify-center gap-3 transition transform active:scale-95"
                  >
                    <Mic className="w-6 h-6" />
                    Start 30-Second Journal Check-in
                  </button>
                </div>
              )}

              {/* Live 30-Second Recording State */}
              {isRecording && (
                <div className="p-6 rounded-3xl bg-white border-4 border-rose-300 shadow-lg text-center space-y-4">
                  <Mascot mood="listening" size="sm" speechBubble="I'm listening! Tell me about your day!" tier={tier} />

                  {/* Circular Timer / Seconds Counter */}
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-6 h-6 text-rose-500 animate-spin" />
                    <span className="text-4xl font-black text-rose-900 font-['Fredoka']">
                      {secondsRemaining}s
                    </span>
                    <span className="text-xs font-bold text-rose-700">remaining</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-rose-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${((30 - secondsRemaining) / 30) * 100}%` }}
                    />
                  </div>

                  {/* Live Transcript Preview */}
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-left min-h-16">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block mb-1">
                      What Barnaby is hearing:
                    </span>
                    <p className="text-sm font-medium text-slate-800">
                      {transcript || 'Listening to your voice... Speak loud and clear!'}
                    </p>
                  </div>

                  {/* Done Button */}
                  <button
                    onClick={() => handleStopAndSubmit()}
                    className="py-3 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base shadow-lg flex items-center justify-center gap-2 mx-auto transition transform active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    I'm Done Sharing!
                  </button>
                </div>
              )}

              {/* Analyzing State */}
              {isAnalyzing && (
                <div className="p-10 rounded-3xl bg-white border-4 border-rose-200 shadow-lg text-center flex flex-col items-center space-y-4">
                  <Mascot mood="thinking" size="md" speechBubble="Writing a gentle response just for you..." />
                  <h3 className="text-xl font-black text-rose-950 font-['Fredoka']">
                    Barnaby is listening to your check-in...
                  </h3>
                  <p className="text-xs text-rose-700">
                    Preparing gentle encouragement and your daily journal badge!
                  </p>
                </div>
              )}

              {/* Response Completed View */}
              {currentResponse && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 sm:p-6 rounded-3xl bg-white border-4 border-rose-300 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{currentResponse.moodEmoji}</span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                          Today's Entry
                        </span>
                        <h3 className="text-lg font-black text-rose-950 font-['Fredoka'] mt-0.5">
                          {currentResponse.journalTitle}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() => handleHearResponse(currentResponse.gentleResponse)}
                      className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 transition"
                      title="Hear Barnaby's gentle response"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Barnaby's Gentle Encouraging Response */}
                  <div className="p-4 rounded-2xl bg-linear-to-r from-rose-50 to-pink-50 border-2 border-rose-200">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-900 uppercase mb-1">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <span>Barnaby's Gentle Response:</span>
                    </div>
                    <p className="text-sm font-semibold text-rose-950 leading-relaxed font-['Fredoka']">
                      "{currentResponse.gentleResponse}"
                    </p>
                  </div>

                  {/* Micro Badge Earned */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>Badge Earned: {currentResponse.celebrationBadge}</span>
                    </div>
                    <span className="font-extrabold text-amber-700">+40 pts</span>
                  </div>

                  {/* What the child said */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="font-bold text-slate-500 block mb-0.5">What you shared:</span>
                    "{currentResponse.transcript}"
                  </div>

                  {/* Reset to Record Another */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        sfx.playPop();
                        setCurrentResponse(null);
                        setTranscript('');
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Record Another Entry
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-md transition"
                    >
                      Done for Today!
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            /* Past Entries Diary List */
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl bg-white border-2 border-rose-200 shadow-xs hover:border-rose-300 transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{entry.moodEmoji}</span>
                      <div>
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5 font-['Fredoka']">
                          <span>{entry.journalTitle}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({entry.date})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{entry.prompt}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleHearResponse(entry.gentleResponse)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 transition"
                      title="Hear Barnaby's response"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-2 italic">
                    "{entry.transcript}"
                  </p>

                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-xs text-rose-950 font-medium flex items-start gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0 mt-0.5" />
                    <span>{entry.gentleResponse}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-rose-200 flex items-center justify-between text-xs text-slate-500">
          <span>Speaking just 30 seconds a day builds fluency!</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-rose-200 hover:bg-rose-300 font-bold text-rose-900 transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
