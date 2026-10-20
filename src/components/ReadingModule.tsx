import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Upload,
  Camera,
  BookOpen,
  Volume2,
  Mic,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Star,
  Award,
  FileText,
  Play,
  HelpCircle,
} from 'lucide-react';
import { DifficultyTier, FlaggedWord, ActivityMode, StoryChoiceOption } from '../types';
import { SAMPLE_TEXTBOOK_PAGES, SAMPLE_STORY_CHOICES } from '../data/sampleCurriculum';
import { Mascot } from './Mascot';
import { sfx, speakText, createSpeechRecognizer, isSpeechRecognitionSupported, stopCurrentAudio } from '../utils/audio';
import { alignReadingTranscript, cleanWord, levenshteinDistance } from '../utils/textMatcher';

interface ReadingModuleProps {
  tier: DifficultyTier;
  onFinishReading: (points: number, accuracy: number, unlockedStickers: string[]) => void;
  onBackToHome: () => void;
}

type ReadingStep =
  | 'choose_input' // Upload photo or select sample
  | 'analyzing' // OCR processing
  | 'mismatch_warning' // Level mismatch advice
  | 'reading_aloud' // Child reads passage aloud, silent tracking
  | 'review_flagged' // Review flagged words one by one with repeat
  | 'interactive_choice' // User chooses what happens next
  | 'story_continuation' // Narrates the continuation
  | 'completed'; // Friendly end summary

export const ReadingModule: React.FC<ReadingModuleProps> = ({
  tier,
  onFinishReading,
  onBackToHome,
}) => {
  const [step, setStep] = useState<ReadingStep>('choose_input');
  const [mode, setMode] = useState<ActivityMode>('practice');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [passageTitle, setPassageTitle] = useState('My Textbook Page');
  const [passageText, setPassageText] = useState('');
  const [detectedTier, setDetectedTier] = useState<DifficultyTier>(tier);
  const [mismatchMessage, setMismatchMessage] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Reading Aloud state
  const [isReadingActive, setIsReadingActive] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>([]);
  const [currentFlaggedIndex, setCurrentFlaggedIndex] = useState(0);
  const [reviewWordSuccess, setReviewWordSuccess] = useState<boolean | null>(null);
  const [isRepeatingWord, setIsRepeatingWord] = useState(false);
  const [accuracy, setAccuracy] = useState(90);

  // Interactive Storytelling state
  const [chosenOption, setChosenOption] = useState<StoryChoiceOption | null>(null);
  const [continuationText, setContinuationText] = useState('');
  const [isLoadingContinuation, setIsLoadingContinuation] = useState(false);
  const [isSpeakingContinuation, setIsSpeakingContinuation] = useState(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognizerRef = useRef<any>(null);

  // Cleanup audio & speech when unmounting
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Handle image upload from camera or file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sfx.playPop();
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setPassageTitle('Uploaded Textbook Page');
      runOCR(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // Run OCR via server API
  const runOCR = async (base64Image: string, mimeType: string) => {
    setStep('analyzing');
    setOcrError(null);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType,
          currentTier: tier,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setOcrError(
          data.message ||
            'The photo looks a bit blurry or dark. Please hold steady and try another snap!'
        );
        setStep('choose_input');
        return;
      }

      setPassageText(data.text);
      setDetectedTier(data.detectedTier || tier);

      if (data.isMismatch && data.mismatchAdvice) {
        setMismatchMessage(data.mismatchAdvice);
        setStep('mismatch_warning');
      } else {
        setStep('reading_aloud');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      // Graceful fallback
      const fallback = SAMPLE_TEXTBOOK_PAGES.find((p) => p.tier === tier) || SAMPLE_TEXTBOOK_PAGES[0];
      setPassageText(fallback.text);
      setPassageTitle(fallback.title);
      setStep('reading_aloud');
    }
  };

  // Pick a pre-made sample page
  const handleSelectSample = (sample: (typeof SAMPLE_TEXTBOOK_PAGES)[0]) => {
    sfx.playPop();
    setSelectedImage(null);
    setPassageTitle(sample.title);
    setPassageText(sample.text);
    setDetectedTier(sample.tier);

    if (sample.tier !== tier) {
      setMismatchMessage(
        `This sample page is designed for ${sample.tier} tier, while your current tier is ${tier}. Would you like to read it anyway?`
      );
      setStep('mismatch_warning');
    } else {
      setStep('reading_aloud');
    }
  };

  // Start reading aloud with silent speech tracking
  const handleStartReadingAloud = () => {
    sfx.playPop();
    setIsReadingActive(true);
    setSpeechTranscript('');

    if (!isSpeechRecognitionSupported()) {
      // In browsers without Web Speech recognition, allow reading with a visual pointer and complete button
      return;
    }

    const recognizer = createSpeechRecognizer(
      (text) => {
        setSpeechTranscript(text);
      },
      (err) => {
        console.warn('Speech error during reading aloud:', err);
      },
      () => {
        // Recognition completed or ended
      }
    );

    speechRecognizerRef.current = recognizer;
    try {
      recognizer?.start();
    } catch {}
  };

  // Stop reading aloud and silently evaluate
  const handleFinishReadingAloud = () => {
    sfx.playDing();
    setIsReadingActive(false);

    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {}
    }

    // Lenient alignment and evaluation
    const result = alignReadingTranscript(passageText, speechTranscript, tier);
    setAccuracy(result.accuracyPercentage);
    setFlaggedWords(result.flaggedWords);
    setCurrentFlaggedIndex(0);

    if (result.flaggedWords.length > 0) {
      setStep('review_flagged');
    } else {
      setStep('interactive_choice');
    }
  };

  // Narration of current flagged word
  const handleHearFlaggedWord = () => {
    const fw = flaggedWords[currentFlaggedIndex];
    if (!fw) return;
    sfx.playPop();
    speakText(fw.word, undefined, undefined, tier);
  };

  // Practice repeating the flagged word
  const handleRepeatFlaggedWord = () => {
    const fw = flaggedWords[currentFlaggedIndex];
    if (!fw) return;

    sfx.playPop();
    setIsRepeatingWord(true);
    setReviewWordSuccess(null);

    if (!isSpeechRecognitionSupported()) {
      // Fallback
      setReviewWordSuccess(true);
      setIsRepeatingWord(false);
      sfx.playDing();
      return;
    }

    let rec: any = null;
    rec = createSpeechRecognizer(
      (text) => {
        const targetClean = cleanWord(fw.word);
        const spokenClean = cleanWord(text);
        const match =
          spokenClean.includes(targetClean) ||
          levenshteinDistance(targetClean, spokenClean) <= (tier === 'Basic' ? 2 : 1);

        if (match) {
          try {
            rec?.stop();
          } catch {}
          setIsRepeatingWord(false);
          setReviewWordSuccess(true);
          sfx.playDing();

          // Mark mastered
          setFlaggedWords((prev) =>
            prev.map((item, idx) => (idx === currentFlaggedIndex ? { ...item, mastered: true } : item))
          );
        }
      },
      () => {
        setIsRepeatingWord(false);
      },
      () => {
        setIsRepeatingWord(false);
      }
    );

    try {
      rec?.start();
      setTimeout(() => {
        if (isRepeatingWord) {
          try {
            rec?.stop();
          } catch {}
          setIsRepeatingWord(false);
          // Lenient fallback: give kid benefit of the doubt
          setReviewWordSuccess(true);
          sfx.playDing();
        }
      }, 4000);
    } catch {
      setIsRepeatingWord(false);
    }
  };

  // Advance to next flagged word or interactive choice
  const handleNextFlaggedWord = () => {
    sfx.playPop();
    setReviewWordSuccess(null);
    if (currentFlaggedIndex + 1 < flaggedWords.length) {
      setCurrentFlaggedIndex((i) => i + 1);
    } else {
      setStep('interactive_choice');
    }
  };

  // Interactive Storytelling Choice
  const handleSelectStoryChoice = async (option: StoryChoiceOption) => {
    sfx.playDing();
    setChosenOption(option);
    setIsLoadingContinuation(true);
    setStep('story_continuation');

    try {
      const res = await fetch('/api/story-continuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseText: passageText,
          chosenOption: option.title,
          tier,
        }),
      });

      const data = await res.json();
      const text =
        data.continuationText ||
        `Because you chose "${option.title}", a friendly golden bird swooped down with a magical sparkle to guide the way!`;
      setContinuationText(text);

      // Auto-narrate the exciting continuation!
      setIsSpeakingContinuation(true);
      speakText(text, undefined, () => setIsSpeakingContinuation(false), tier);
    } catch (err) {
      console.error('Continuation error:', err);
      const fallbackText = `What a super choice! Barnaby and his friends ventured on, finding lots of smiles and laughter along the path!`;
      setContinuationText(fallbackText);
    } finally {
      setIsLoadingContinuation(false);
    }
  };

  // Complete Reading Module
  const handleFinishAll = () => {
    sfx.playFanfare();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
    setStep('completed');

    // Calculate rewards: +100 base, +20 for reviewing flagged words, +30 for story choice
    const totalPoints = 150;
    const stickersToUnlock: string[] = ['stk-reading-owl', 'stk-story-teller'];
    onFinishReading(totalPoints, accuracy, stickersToUnlock);
  };

  // Current flagged word being reviewed
  const activeFlaggedWord = flaggedWords[currentFlaggedIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Module Title Ribbon */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-amber-500 flex items-center justify-center text-white shadow-md">
            <BookOpen className="w-6 h-6 text-amber-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-amber-950 font-['Fredoka']">
                Module 1: Reading
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-800">
                {tier} Tier
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-800 font-medium">
              Snap your textbook page, read along with Barnaby, and shape your own story!
            </p>
          </div>
        </div>

        {/* Mode Toggle (Practice vs Quiz) */}
        <div className="flex items-center p-1 bg-amber-100 rounded-2xl border border-amber-300">
          <button
            onClick={() => {
              sfx.playPop();
              setMode('practice');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'practice'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            Practice Mode
          </button>
          <button
            onClick={() => {
              sfx.playPop();
              setMode('quiz');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'quiz'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            IELTS Challenge
          </button>
        </div>
      </div>

      {/* ================= STEP 1: CHOOSE INPUT ================= */}
      {step === 'choose_input' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* OCR Error Alert */}
          {ocrError && (
            <div className="p-4 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">{ocrError}</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Tip: Hold the book flat in good light, or try one of the instant sample pages below!
                </p>
              </div>
            </div>
          )}

          {/* Upload Card */}
          <div className="bg-white rounded-3xl border-4 border-amber-200 shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 mb-4 shadow-inner">
                <Camera className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-amber-950 font-['Fredoka'] mb-2">
                Snap or Upload Your Textbook Page
              </h2>
              <p className="text-sm text-amber-800 mb-6 font-medium">
                Take a photo of any story from your English textbook. English Buddy will read it with you!
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => {
                  sfx.playPop();
                  fileInputRef.current?.click();
                }}
                className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-3 transition transform active:scale-95"
              >
                <Upload className="w-6 h-6" />
                Upload Textbook Photo
              </button>
            </div>
          </div>

          {/* OR Quick Sample Pages */}
          <div className="bg-amber-50/80 rounded-3xl border-2 border-amber-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-amber-950 font-['Fredoka']">
                Or Pick a Sample Reading Page:
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_TEXTBOOK_PAGES.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectSample(page)}
                  className="p-4 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 hover:shadow-md text-left transition flex items-start justify-between group active:scale-98"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-amber-950 font-['Fredoka']">
                        {page.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          page.tier === 'Basic'
                            ? 'bg-emerald-100 text-emerald-800'
                            : page.tier === 'Intermediate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {page.tier}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 line-clamp-2 leading-relaxed">
                      "{page.text}"
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-400 group-hover:text-amber-600 group-hover:translate-x-1 transition shrink-0 ml-2 mt-1" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= STEP: ANALYZING OCR ================= */}
      {step === 'analyzing' && (
        <div className="bg-white rounded-3xl border-4 border-amber-200 shadow-xl p-10 text-center flex flex-col items-center">
          <Mascot mood="thinking" size="md" speechBubble="Reading your page with my superpower vision..." />
          <h2 className="text-2xl font-black text-amber-950 font-['Fredoka'] mt-4 mb-2">
            Extracting Textbook Text...
          </h2>
          <p className="text-sm text-amber-800 max-w-sm">
            Checking readability and matching difficulty with your {tier} level!
          </p>
          <div className="w-48 h-2 bg-amber-100 rounded-full overflow-hidden mt-6">
            <motion.div
              className="h-full bg-amber-500 rounded-full"
              animate={{ width: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* ================= STEP: MISMATCH WARNING ================= */}
      {step === 'mismatch_warning' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border-4 border-amber-300 shadow-xl p-6 sm:p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-4">
            <HelpCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-amber-950 font-['Fredoka'] mb-2">
            Level Check Alert!
          </h2>
          <p className="text-base text-amber-900 font-medium mb-6 max-w-md mx-auto">
            {mismatchMessage ||
              `This text was identified as ${detectedTier} level, while you are currently set to ${tier}.`}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                sfx.playPop();
                setStep('choose_input');
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm transition"
            >
              Choose Simpler Page
            </button>
            <button
              onClick={() => {
                sfx.playPop();
                setStep('reading_aloud');
              }}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md transition"
            >
              I Want to Try Reading Anyway!
            </button>
          </div>
        </motion.div>
      )}

      {/* ================= STEP 2: READING ALOUD & SILENT TRACKING ================= */}
      {step === 'reading_aloud' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header & Mascot */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-amber-50/90 rounded-3xl border-2 border-amber-200 p-4 sm:p-6">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                {passageTitle}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 font-['Fredoka']">
                Read the Story Out Loud
              </h2>
              <p className="text-xs sm:text-sm text-amber-800">
                Barnaby is listening silently! Take your time, don't worry about stumbles.
              </p>
            </div>
            <Mascot
              mood={isReadingActive ? 'listening' : 'idle'}
              size="sm"
              speechBubble={isReadingActive ? "I'm listening! Speak loud and clear!" : 'Tap the green mic when ready!'}
              tier={tier}
            />
          </div>

          {/* Reading Passage Card */}
          <div className="bg-white rounded-3xl border-4 border-amber-200 shadow-xl p-6 sm:p-8">
            <div
              className={`leading-relaxed text-amber-950 font-medium select-none ${
                tier === 'Basic'
                  ? 'text-2xl sm:text-3xl font-["Fredoka"] space-y-4'
                  : 'text-lg sm:text-xl space-y-3'
              }`}
            >
              {passageText}
            </div>

            {/* Live speech feedback pill */}
            {isReadingActive && speechTranscript && (
              <div className="mt-6 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Heard: "{speechTranscript}"</span>
              </div>
            )}
          </div>

          {/* Action Button: Start / Finish */}
          <div className="flex justify-center">
            {!isReadingActive ? (
              <button
                onClick={handleStartReadingAloud}
                className="py-4 px-10 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xl shadow-xl flex items-center gap-3 transition transform active:scale-95"
              >
                <Mic className="w-7 h-7" />
                Start Reading Aloud!
              </button>
            ) : (
              <button
                onClick={handleFinishReadingAloud}
                className="py-4 px-10 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xl shadow-xl flex items-center gap-3 transition transform active:scale-95 animate-pulse"
              >
                <CheckCircle2 className="w-7 h-7" />
                I'm Done Reading!
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ================= STEP 3: REVIEW FLAGGED WORDS ================= */}
      {step === 'review_flagged' && activeFlaggedWord && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border-4 border-amber-300 shadow-xl p-6 sm:p-8 text-center max-w-xl mx-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold text-amber-700 uppercase">
              Word Practice ({currentFlaggedIndex + 1}/{flaggedWords.length})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              Gentle Coaching
            </span>
          </div>

          <p className="text-sm text-amber-900 font-medium mb-2">
            Let's practice this word together! Listen to Barnaby first:
          </p>

          {/* Flagged Word Card */}
          <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 mb-6">
            <h2 className="text-4xl sm:text-5xl font-black text-amber-950 font-['Fredoka'] mb-4">
              "{activeFlaggedWord.word}"
            </h2>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleHearFlaggedWord}
                className="px-5 py-2.5 rounded-2xl bg-white border-2 border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-sm shadow-xs flex items-center gap-2 transition active:scale-95"
              >
                <Volume2 className="w-5 h-5 text-amber-600" />
                Hear Barnaby Say It
              </button>
            </div>
          </div>

          {/* Practice repeat button */}
          {!reviewWordSuccess ? (
            <div className="space-y-3">
              <button
                onClick={handleRepeatFlaggedWord}
                disabled={isRepeatingWord}
                className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-3 transition transform active:scale-95 ${
                  isRepeatingWord
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                <Mic className="w-6 h-6" />
                {isRepeatingWord ? 'Listening... Say the word!' : `Repeat "${activeFlaggedWord.word}"`}
              </button>
              <button
                onClick={handleNextFlaggedWord}
                className="text-xs font-bold text-amber-700 hover:text-amber-900"
              >
                Skip to next word
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-emerald-900 flex items-center justify-center gap-2 font-bold font-['Fredoka'] text-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                Super pronunciation! You nailed it!
              </div>
              <button
                onClick={handleNextFlaggedWord}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-lg shadow-md flex items-center justify-center gap-2 transition"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ================= STEP 4: INTERACTIVE STORYTELLING CHOICE ================= */}
      {step === 'interactive_choice' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-linear-to-r from-amber-400 to-orange-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-center">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider">
              Interactive Storyteller Mode
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-['Fredoka'] mt-2 mb-2">
              What Should Happen Next?
            </h2>
            <p className="text-sm sm:text-base text-amber-100 max-w-lg mx-auto">
              You are the story explorer! Tap your favorite choice below to continue our adventure!
            </p>
          </div>

          {/* 3 Large Tappable Story Choices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SAMPLE_STORY_CHOICES.default.map((choice) => (
              <motion.button
                key={choice.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectStoryChoice(choice)}
                className="p-6 rounded-3xl bg-white border-4 border-amber-200 hover:border-amber-400 shadow-lg text-left transition flex flex-col justify-between group"
              >
                <div>
                  <div className="text-5xl mb-3 select-none drop-shadow-sm">{choice.emoji}</div>
                  <h3 className="text-lg font-black text-amber-950 font-['Fredoka'] mb-2 group-hover:text-amber-600 transition">
                    {choice.title}
                  </h3>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    {choice.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-600">
                  <span>Choose This Path</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ================= STEP 5: STORY CONTINUATION NARRATION ================= */}
      {step === 'story_continuation' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border-4 border-amber-200 shadow-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-amber-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{chosenOption?.emoji || '📖'}</span>
              <div>
                <span className="text-xs font-extrabold text-amber-600 uppercase">
                  Your Story Choice:
                </span>
                <h3 className="text-xl font-black text-amber-950 font-['Fredoka']">
                  {chosenOption?.title}
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                sfx.playPop();
                setIsSpeakingContinuation(true);
                speakText(continuationText, undefined, () => setIsSpeakingContinuation(false), tier);
              }}
              disabled={isLoadingContinuation}
              className="p-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
              title="Hear Story Continuation"
            >
              <Volume2 className={`w-6 h-6 ${isSpeakingContinuation ? 'animate-bounce' : ''}`} />
            </button>
          </div>

          {isLoadingContinuation ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Mascot mood="thinking" size="md" speechBubble="Weaving your story path..." />
              <p className="text-sm font-bold text-amber-900 mt-4">Writing what happens next...</p>
            </div>
          ) : (
            <div>
              <p
                className={`leading-relaxed text-amber-950 font-medium ${
                  tier === 'Basic'
                    ? 'text-2xl font-["Fredoka"]'
                    : 'text-lg sm:text-xl'
                }`}
              >
                {continuationText}
              </p>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleFinishAll}
                  className="py-4 px-10 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xl shadow-xl flex items-center gap-3 transition transform active:scale-95"
                >
                  <Sparkles className="w-6 h-6" />
                  See My Reading Summary!
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ================= STEP 6: COMPLETED SUMMARY ================= */}
      {step === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl p-6 sm:p-10 text-center max-w-xl mx-auto space-y-6"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-5xl shadow-inner">
            🦉
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-amber-950 font-['Fredoka']">
              Reading Champion!
            </h2>
            <p className="text-base text-amber-800 font-medium mt-1">
              You read your passage aloud and built an exciting story continuation!
            </p>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="text-xs text-amber-700 font-bold uppercase">Accuracy</div>
              <div className="text-2xl font-black text-amber-950 font-['Fredoka']">
                {accuracy}%
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="text-xs text-amber-700 font-bold uppercase">Points Earned</div>
              <div className="text-2xl font-black text-amber-950 font-['Fredoka']">
                +150 pts
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Unlocked "Professor Owl" & "Story Weaver" stickers in your Backpack!</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                sfx.playPop();
                setStep('choose_input');
                setSelectedImage(null);
                setPassageText('');
              }}
              className="px-6 py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Read Another Page
            </button>
            <button
              onClick={() => {
                sfx.playPop();
                onBackToHome();
              }}
              className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md transition"
            >
              Next Module (Listening)
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
