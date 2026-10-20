import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Mic,
  Volume2,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import {
  DifficultyTier,
  ActivityMode,
  SpeakingPart1Prompt,
  SpeakingPart2Topic,
  SpeakingPart3Question,
} from '../types';
import {
  SPEAKING_PART_1_PROMPTS,
  SPEAKING_PART_2_TOPICS,
  SPEAKING_PART_3_CONVERSATIONS,
} from '../data/sampleCurriculum';
import { Mascot } from './Mascot';
import { speakText, stopCurrentAudio, sfx, createSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/audio';

interface SpeakingModuleProps {
  tier: DifficultyTier;
  onFinishSpeaking: (points: number, unlockedStickers: string[]) => void;
  onBackToHome: () => void;
}

type SpeakingPart = 1 | 2 | 3;
type SpeakingStage =
  | 'part_intro'
  | 'rehearsal' // Practice prompts / hints
  | 'prep_timer' // Part 2 prep countdown
  | 'speaking_live' // Recording speech with timer
  | 'reconstruct_polish' // End of round: polished version reconstruction & repeat back
  | 'part_complete'
  | 'all_complete';

export const SpeakingModule: React.FC<SpeakingModuleProps> = ({
  tier,
  onFinishSpeaking,
  onBackToHome,
}) => {
  const [currentPart, setCurrentPart] = useState<SpeakingPart>(1);
  const [stage, setStage] = useState<SpeakingStage>('part_intro');
  const [mode, setMode] = useState<ActivityMode>('practice');

  // Part 1 state
  const [part1Index, setPart1Index] = useState(0);
  const activePart1: SpeakingPart1Prompt = SPEAKING_PART_1_PROMPTS[part1Index];

  // Part 2 state
  const [part2Index, setPart2Index] = useState(0);
  const activePart2: SpeakingPart2Topic = SPEAKING_PART_2_TOPICS[part2Index];
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(15);
  const [showWordBank, setShowWordBank] = useState(false);

  // Part 3 state
  const activePart3Conversation = SPEAKING_PART_3_CONVERSATIONS[0];
  const [part3QuestionIndex, setPart3QuestionIndex] = useState(0);
  const activePart3Question: SpeakingPart3Question =
    activePart3Conversation.questions[part3QuestionIndex];

  // Live Speaking state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speakingDuration, setSpeakingDuration] = useState(0);
  const targetDuration =
    currentPart === 1 ? 15 : activePart2.durationSeconds[tier] || 30;

  // Polishing / Reconstruction state
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishedText, setPolishedText] = useState('');
  const [coachPraise, setCoachPraise] = useState('');
  const [coachTip, setCoachTip] = useState('');
  const [hasRepeatedPolished, setHasRepeatedPolished] = useState(false);

  const speechRecognizerRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Clean up
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      clearInterval(timerIntervalRef.current);
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Prep timer countdown for Part 2
  useEffect(() => {
    if (stage === 'prep_timer') {
      const initialPrep = activePart2.prepTimeSeconds[tier] || 15;
      setPrepSecondsLeft(initialPrep);

      const interval = setInterval(() => {
        setPrepSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startLiveSpeaking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [stage]);

  // Start live recording
  const startLiveSpeaking = () => {
    sfx.playDing();
    setStage('speaking_live');
    setIsRecording(true);
    setTranscript('');
    setSpeakingDuration(0);

    // Start duration timer
    timerIntervalRef.current = setInterval(() => {
      setSpeakingDuration((sec) => sec + 1);
    }, 1000);

    if (!isSpeechRecognitionSupported()) return;

    const recognizer = createSpeechRecognizer(
      (text) => {
        setTranscript(text);
      },
      (err) => {
        console.warn('Speech error during speaking module:', err);
      },
      () => {
        // Recognition cycle ended
      }
    );

    speechRecognizerRef.current = recognizer;
    try {
      recognizer?.start();
    } catch {}
  };

  // Stop recording and reconstruct polished version
  const handleStopSpeaking = async () => {
    sfx.playPop();
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);

    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {}
    }

    // Call API to reconstruct polished version
    setIsPolishing(true);
    setStage('reconstruct_polish');

    const promptTitle =
      currentPart === 1
        ? activePart1.title
        : currentPart === 2
        ? activePart2.topic
        : activePart3Question.question;

    try {
      const res = await fetch('/api/polish-speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript || 'I spoke about my favorite things with lots of smiles!',
          promptTitle,
          part: currentPart,
          durationSeconds: speakingDuration,
          targetDuration,
          tier,
          mode,
        }),
      });

      const data = await res.json();
      setPolishedText(data.polishedText);
      setCoachPraise(data.praise);
      setCoachTip(data.coachingTip);

      // Auto-narrate the polished version for the child to hear
      speakText(
        `Here is a superstar way to say it: ${data.polishedText}`,
        undefined,
        undefined,
        tier
      );
    } catch (err) {
      console.error('Polish speaking error:', err);
      setPolishedText(
        currentPart === 1
          ? activePart1.sampleAnswer
          : 'I really enjoyed sharing my thoughts with you today!'
      );
      setCoachPraise(`Awesome speaking for ${speakingDuration} seconds!`);
      setCoachTip('Keep using your brave voice every day!');
    } finally {
      setIsPolishing(false);
    }
  };

  // Re-read polished version
  const handleHearPolished = () => {
    sfx.playPop();
    speakText(polishedText, undefined, undefined, tier);
  };

  // Child repeats the polished version
  const handleRepeatPolished = () => {
    sfx.playPop();
    setHasRepeatedPolished(true);
    sfx.playDing();
  };

  // Advance to next part
  const handleAdvancePart = () => {
    sfx.playPop();
    setHasRepeatedPolished(false);
    setTranscript('');

    if (currentPart === 1) {
      setCurrentPart(2);
      setStage('part_intro');
    } else if (currentPart === 2) {
      setCurrentPart(3);
      setPart3QuestionIndex(0);
      setStage('part_intro');
    } else {
      // Completed all 3 parts!
      sfx.playFanfare();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
      setStage('all_complete');
      onFinishSpeaking(180, ['stk-brave-lion', 'stk-cupcake-fox']);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Module Title Banner */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center text-white shadow-md">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 font-['Fredoka']">
                Module 3: Speaking
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Part {currentPart} of 3
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-800 font-medium">
              IELTS-style speaking with confidence-building coaching and zero stress!
            </p>
          </div>
        </div>

        {/* IELTS Part Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-emerald-100 rounded-2xl border border-emerald-300">
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              onClick={() => {
                sfx.playPop();
                setCurrentPart(p as SpeakingPart);
                setStage('part_intro');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                currentPart === p
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              Part {p}
            </button>
          ))}
        </div>
      </div>

      {/* ================= PART 1: SELF-INTRODUCTION ================= */}
      {currentPart === 1 && (
        <div className="space-y-6">
          {stage === 'part_intro' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border-4 border-emerald-200 shadow-xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold uppercase px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  Part 1: Self-Introduction
                </span>
                <button
                  onClick={() => speakText(activePart1.question, undefined, undefined, tier)}
                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition"
                  title="Hear Coach Barnaby ask this"
                >
                  <Volume2 className="w-5 h-5 text-emerald-700" />
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 font-['Fredoka'] mb-4">
                {activePart1.question}
              </h2>

              {/* Practice Mode Guidance & Sentence Starters */}
              <div className="p-5 bg-emerald-50/70 rounded-2xl border-2 border-emerald-200 mb-6">
                <span className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Sentence Starters to Help You:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activePart1.hints.map((hint, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 shadow-2xs"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Model Answer Button */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs font-bold text-amber-800">Need inspiration?</div>
                  <div className="text-xs text-amber-900/80">
                    "{activePart1.sampleAnswer}"
                  </div>
                </div>
                <button
                  onClick={() => speakText(activePart1.sampleAnswer, undefined, undefined, tier)}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold text-amber-900 shrink-0 ml-3 transition"
                >
                  Hear Example
                </button>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={startLiveSpeaking}
                  className="py-4 px-10 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xl shadow-xl flex items-center gap-3 transition transform active:scale-95"
                >
                  <Mic className="w-7 h-7" />
                  Tap to Introduce Yourself!
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ================= PART 2: MONOLOGUE ================= */}
      {currentPart === 2 && (
        <div className="space-y-6">
          {stage === 'part_intro' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border-4 border-emerald-200 shadow-xl p-6 sm:p-8">
              <span className="text-xs font-extrabold uppercase px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                Part 2: Monologue Cue Card
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 font-['Fredoka'] mt-3 mb-4">
                "{activePart2.topic}"
              </h2>

              {/* Cue Card Talking Points */}
              <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-200 mb-6">
                <span className="text-xs font-bold text-emerald-800 uppercase block mb-2">
                  Things You Can Talk About:
                </span>
                <ul className="space-y-2">
                  {activePart2.cueCard.map((point, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-emerald-950 font-medium">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Word Bank Toggle (Practice Mode) */}
              <div className="mb-6">
                <button
                  onClick={() => setShowWordBank(!showWordBank)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  {showWordBank ? 'Hide Word Bank' : 'Show Helpful Word Bank (Hints)'}
                </button>

                {showWordBank && (
                  <div className="mt-2 p-3 bg-white rounded-2xl border border-emerald-200 flex flex-wrap gap-2">
                    {activePart2.wordBank.map((w, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Start Prep Timer button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    sfx.playPop();
                    setStage('prep_timer');
                  }}
                  className="py-4 px-10 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xl shadow-xl flex items-center gap-3 transition transform active:scale-95"
                >
                  <Clock className="w-7 h-7" />
                  Start Prep Time ({activePart2.prepTimeSeconds[tier]}s)
                </button>
              </div>
            </motion.div>
          )}

          {/* Prep Timer Countdown */}
          {stage === 'prep_timer' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border-4 border-emerald-300 shadow-xl p-8 text-center max-w-md mx-auto">
              <span className="text-xs font-extrabold uppercase px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
                Preparation Time
              </span>

              <div className="text-6xl font-black text-emerald-600 font-['Fredoka'] my-6 animate-pulse">
                {prepSecondsLeft}s
              </div>

              <p className="text-sm text-emerald-950 font-medium mb-4">
                Think about what you will say! Speaking starts automatically when the timer reaches zero.
              </p>

              <button
                onClick={startLiveSpeaking}
                className="px-6 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 font-bold text-xs text-emerald-900 transition"
              >
                I'm Ready Now! Skip Prep
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ================= PART 3: CONVERSATION (INTERVIEWER) ================= */}
      {currentPart === 3 && (
        <div className="space-y-6">
          {stage === 'part_intro' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border-4 border-emerald-200 shadow-xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold uppercase px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                  Part 3: Interview Conversation
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Question {part3QuestionIndex + 1} of {activePart3Conversation.questions.length}
                </span>
              </div>

              {/* Mascot Interviewer */}
              <div className="flex items-center gap-4 bg-emerald-50 rounded-2xl p-4 border border-emerald-200 mb-6">
                <Mascot mood="talking" size="sm" />
                <div>
                  <div className="text-xs font-bold text-emerald-700">Coach Barnaby asks:</div>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-950 font-['Fredoka']">
                    "{activePart3Question.question}"
                  </h3>
                </div>
              </div>

              {/* Friendly Coach Tip */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium mb-6">
                💡 <span className="font-bold">Coach Tip: </span>
                {activePart3Question.tip}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={startLiveSpeaking}
                  className="py-4 px-10 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xl shadow-xl flex items-center gap-3 transition transform active:scale-95"
                >
                  <Mic className="w-7 h-7" />
                  Answer Barnaby!
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ================= LIVE SPEAKING STAGE ================= */}
      {stage === 'speaking_live' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border-4 border-emerald-300 shadow-xl p-6 sm:p-8 text-center space-y-6">
          <Mascot mood="listening" size="md" speechBubble="I hear you loud and clear! Keep talking!" tier={tier} />

          {/* Duration Counter */}
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span className="text-4xl font-black text-emerald-950 font-['Fredoka']">
              {speakingDuration}s
            </span>
            <span className="text-xs font-bold text-emerald-700 uppercase">
              / Target: ~{targetDuration}s
            </span>
          </div>

          {/* Live speech transcription */}
          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 min-h-20 text-left">
            <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">
              What Barnaby is hearing:
            </span>
            <p className="text-base text-emerald-950 font-medium">
              {transcript || 'Listening to your wonderful ideas...'}
            </p>
          </div>

          <button
            onClick={handleStopSpeaking}
            className="py-4 px-10 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xl shadow-xl flex items-center justify-center gap-3 mx-auto transition transform active:scale-95 animate-pulse"
          >
            <CheckCircle2 className="w-7 h-7" />
            I'm Done Speaking!
          </button>
        </motion.div>
      )}

      {/* ================= POLISH & REPEAT (LEARNING MOMENT) ================= */}
      {stage === 'reconstruct_polish' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border-4 border-emerald-300 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <span className="text-xs font-extrabold uppercase px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              Learning Moment & Feedback
            </span>
            <span className="text-xs font-bold text-emerald-700">
              Confidence-Building Review
            </span>
          </div>

          {/* Coach Praise */}
          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 text-center">
            <h3 className="text-2xl font-black text-emerald-950 font-['Fredoka'] mb-1">
              {coachPraise || 'You spoke with such courage and creativity!'}
            </h3>
            <p className="text-xs text-emerald-800 font-medium">{coachTip}</p>
          </div>

          {/* Polished Reconstruction */}
          <div className="p-6 bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Superstar Way to Say It:
              </span>
              <button
                onClick={handleHearPolished}
                className="p-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 transition"
                title="Listen to polished version"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-950 font-['Fredoka'] leading-relaxed">
              "{polishedText}"
            </p>
          </div>

          {/* Repeat After Me practice */}
          <div className="text-center space-y-3">
            {!hasRepeatedPolished ? (
              <button
                onClick={handleRepeatPolished}
                className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-3 transition transform active:scale-95"
              >
                <Mic className="w-6 h-6" />
                Practice Repeating the Superstar Phrasing!
              </button>
            ) : (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 font-bold text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Awesome practice! You repeated it like a champ!
              </div>
            )}

            <button
              onClick={handleAdvancePart}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-lg shadow-md flex items-center justify-center gap-2 transition"
            >
              <span>{currentPart === 3 ? 'Finish Speaking Module' : `Proceed to Part ${currentPart + 1}`}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ================= ALL COMPLETE SUMMARY ================= */}
      {stage === 'all_complete' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border-4 border-emerald-300 shadow-2xl p-6 sm:p-10 text-center max-w-xl mx-auto space-y-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-5xl shadow-inner">
            🦁
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 font-['Fredoka']">
              Brave Speaker Star!
            </h2>
            <p className="text-base text-emerald-800 font-medium mt-1">
              You completed all 3 IELTS speaking parts with confidence, courage, and enthusiasm!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-700 font-bold uppercase">Confidence Score</div>
              <div className="text-2xl font-black text-emerald-950 font-['Fredoka']">
                100% Star
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-700 font-bold uppercase">Points Earned</div>
              <div className="text-2xl font-black text-emerald-950 font-['Fredoka']">
                +180 pts
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Unlocked "Brave Leo" & "Pip the Fox" stickers in your Backpack!</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                sfx.playPop();
                setCurrentPart(1);
                setStage('part_intro');
              }}
              className="px-6 py-3 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Practice Again
            </button>
            <button
              onClick={() => {
                sfx.playPop();
                onBackToHome();
              }}
              className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition"
            >
              Back to Adventure Map
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
