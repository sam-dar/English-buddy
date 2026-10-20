import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Headphones,
  Volume2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Mic,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Wand2,
} from 'lucide-react';
import { DifficultyTier, ListeningQuestion, ListeningStory, ActivityMode } from '../types';
import { LISTENING_STORIES } from '../data/sampleCurriculum';
import { Mascot } from './Mascot';
import { speakText, stopCurrentAudio, sfx, createSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/audio';

interface ListeningModuleProps {
  tier: DifficultyTier;
  onFinishListening: (points: number, score: number, unlockedStickers: string[]) => void;
  onBackToHome: () => void;
}

type ListeningPhase =
  | 'story_selection'
  | 'listening_passage'
  | 'quiz_question'
  | 'question_feedback'
  | 'summary';

export const ListeningModule: React.FC<ListeningModuleProps> = ({
  tier,
  onFinishListening,
  onBackToHome,
}) => {
  const [phase, setPhase] = useState<ListeningPhase>('story_selection');
  const [mode, setMode] = useState<ActivityMode>('practice');
  const [selectedStory, setSelectedStory] = useState<ListeningStory>(LISTENING_STORIES[0]);
  const [isNarrating, setIsNarrating] = useState(false);
  const [hasListenedAtLeastOnce, setHasListenedAtLeastOnce] = useState(false);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [spokenAnswer, setSpokenAnswer] = useState('');
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; praise: string; explanation: string } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const speechRecognizerRef = useRef<any>(null);

  // Filter stories matching tier
  const tierStories = LISTENING_STORIES.filter((s) => s.tier === tier);
  const activeStory = selectedStory || tierStories[0] || LISTENING_STORIES[0];
  const activeQuestion: ListeningQuestion = activeStory.questions[currentQuestionIndex];

  // Stop any ongoing audio when changing phases or unmounting
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

  // Play passage narration (replay allowed ONLY before quiz starts)
  const handlePlayPassage = () => {
    sfx.playPop();
    setIsNarrating(true);
    speakText(
      activeStory.passage,
      undefined,
      () => {
        setIsNarrating(false);
        setHasListenedAtLeastOnce(true);
      },
      tier
    );
  };

  const handleStopPassage = () => {
    stopCurrentAudio();
    setIsNarrating(false);
  };

  // Generate a brand new story with AI
  const handleGenerateStory = async () => {
    sfx.playPop();
    setIsNarrating(true);
    try {
      const res = await fetch('/api/generate-listening-passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, topic: 'adventure and discovery' }),
      });
      const data = await res.json();
      if (data && data.passage && data.questions) {
        const customStory: ListeningStory = {
          id: `gen-${Date.now()}`,
          title: data.title || 'Magical Adventure',
          passage: data.passage,
          tier,
          questions: data.questions,
        };
        setSelectedStory(customStory);
        setPhase('listening_passage');
        setHasListenedAtLeastOnce(false);
      }
    } catch {
      // Keep existing
    } finally {
      setIsNarrating(false);
    }
  };

  // Start the comprehension quiz
  const handleStartQuiz = () => {
    stopCurrentAudio();
    sfx.playDing();
    setPhase('quiz_question');
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setSpokenAnswer('');
    setCorrectCount(0);
  };

  // Listen for spoken answer in Intermediate/Advanced
  const handleRecordSpokenAnswer = () => {
    sfx.playPop();
    setIsRecordingAnswer(true);
    setSpokenAnswer('');

    if (!isSpeechRecognitionSupported()) {
      setIsRecordingAnswer(false);
      return;
    }

    const recognizer = createSpeechRecognizer(
      (text) => {
        setSpokenAnswer(text);
      },
      () => {
        setIsRecordingAnswer(false);
      },
      () => {
        setIsRecordingAnswer(false);
      }
    );

    speechRecognizerRef.current = recognizer;
    try {
      recognizer?.start();
    } catch {
      setIsRecordingAnswer(false);
    }
  };

  const handleStopRecordingAnswer = () => {
    setIsRecordingAnswer(false);
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {}
    }
  };

  // Submit Answer & Evaluate Leniently (check key concepts)
  const handleSubmitAnswer = async () => {
    sfx.playPop();
    setEvaluatingAnswer(true);

    const isBasic = tier === 'Basic';

    if (isBasic) {
      // Multiple Choice evaluation
      const isCorrect = selectedOptionIndex === activeQuestion.correctIndex;
      if (isCorrect) setCorrectCount((c) => c + 1);

      setFeedback({
        isCorrect,
        praise: isCorrect ? 'Spot on! Great listening memory!' : 'Good try! You were super close!',
        explanation: activeQuestion.spokenAnswerHint,
      });

      setEvaluatingAnswer(false);
      setPhase('question_feedback');
      if (isCorrect) sfx.playDing();
    } else {
      // Intermediate / Advanced spoken answer semantic evaluation
      const answerToEvaluate = spokenAnswer || (selectedOptionIndex !== null ? activeQuestion.options[selectedOptionIndex] : '');

      try {
        const res = await fetch('/api/evaluate-listening', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: activeQuestion.question,
            correctAnswerHint: activeQuestion.spokenAnswerHint,
            childAnswer: answerToEvaluate,
            tier,
          }),
        });

        const data = await res.json();
        const correct = Boolean(data.isCorrect);
        if (correct) setCorrectCount((c) => c + 1);

        setFeedback({
          isCorrect: correct,
          praise: data.praise || (correct ? 'Awesome job!' : 'Good effort!'),
          explanation: data.kidExplanation || activeQuestion.spokenAnswerHint,
        });

        if (correct) sfx.playDing();
      } catch {
        // Fallback lenient
        setCorrectCount((c) => c + 1);
        setFeedback({
          isCorrect: true,
          praise: 'Super listening comprehension!',
          explanation: activeQuestion.spokenAnswerHint,
        });
        sfx.playDing();
      } finally {
        setEvaluatingAnswer(false);
        setPhase('question_feedback');
      }
    }
  };

  // Next Question or Summary
  const handleNextQuestion = () => {
    sfx.playPop();
    setFeedback(null);
    setSelectedOptionIndex(null);
    setSpokenAnswer('');

    if (currentQuestionIndex + 1 < activeStory.questions.length) {
      setCurrentQuestionIndex((i) => i + 1);
      setPhase('quiz_question');
    } else {
      // Completed all questions
      sfx.playFanfare();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
      setPhase('summary');
      onFinishListening(140, Math.round((correctCount / activeStory.questions.length) * 100), [
        'stk-space-koala',
      ]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500 border-2 border-blue-600 flex items-center justify-center text-white shadow-md">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-sky-950 font-['Fredoka']">
                Module 2: Listening
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {tier} Tier
              </span>
            </div>
            <p className="text-xs sm:text-sm text-sky-800 font-medium">
              Listen carefully to the audio story, then answer friendly comprehension questions!
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center p-1 bg-sky-100 rounded-2xl border border-sky-300">
          <button
            onClick={() => {
              sfx.playPop();
              setMode('practice');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'practice'
                ? 'bg-white text-sky-900 shadow-xs'
                : 'text-sky-700 hover:text-sky-900'
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => {
              sfx.playPop();
              setMode('quiz');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'quiz'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-sky-700 hover:text-sky-900'
            }`}
          >
            IELTS Scored
          </button>
        </div>
      </div>

      {/* ================= STEP 1: STORY SELECTION ================= */}
      {phase === 'story_selection' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-3xl border-4 border-sky-200 shadow-xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-black text-sky-950 font-['Fredoka']">
                Choose a Listening Story:
              </h2>
              <button
                onClick={handleGenerateStory}
                className="px-4 py-2 rounded-2xl bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
              >
                <Wand2 className="w-4 h-4" />
                Generate New Story
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tierStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => {
                    sfx.playPop();
                    setSelectedStory(story);
                    setPhase('listening_passage');
                    setHasListenedAtLeastOnce(false);
                  }}
                  className="p-5 rounded-2xl bg-sky-50/70 border-2 border-sky-200 hover:border-sky-400 hover:shadow-md text-left transition flex flex-col justify-between group active:scale-98"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-sky-950 font-['Fredoka'] group-hover:text-blue-600 transition">
                        {story.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {story.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                      "{story.passage}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 pt-2 border-t border-sky-100">
                    <span>{story.questions.length} Comprehension Questions</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= STEP 2: NARRATE PASSAGE (REPLAY BEFORE QUIZ ONLY) ================= */}
      {phase === 'listening_passage' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-3xl border-4 border-sky-200 shadow-xl p-6 sm:p-8 text-center flex flex-col items-center">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold uppercase mb-2">
              {activeStory.title}
            </span>

            <Mascot
              mood={isNarrating ? 'talking' : 'idle'}
              size="md"
              speechBubble={
                isNarrating
                  ? 'Listening carefully! Try to picture the story in your mind!'
                  : 'Tap the big audio button to hear the story!'
              }
              tier={tier}
            />

            {/* Story Passage Card */}
            <div className="w-full max-w-xl my-6 p-6 rounded-2xl bg-sky-50 border-2 border-sky-200 text-left">
              <p
                className={`leading-relaxed text-sky-950 font-medium ${
                  tier === 'Basic' ? 'text-xl sm:text-2xl font-["Fredoka"]' : 'text-base sm:text-lg'
                }`}
              >
                {activeStory.passage}
              </p>
            </div>

            {/* Replay / Play Audio Control */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
              {!isNarrating ? (
                <button
                  onClick={handlePlayPassage}
                  className="w-full py-4 px-8 rounded-2xl bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xl shadow-xl flex items-center justify-center gap-3 transition transform active:scale-95"
                >
                  <Volume2 className="w-7 h-7" />
                  {hasListenedAtLeastOnce ? 'Replay Story' : 'Listen to Story'}
                </button>
              ) : (
                <button
                  onClick={handleStopPassage}
                  className="w-full py-4 px-8 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xl shadow-xl flex items-center justify-center gap-3 transition transform active:scale-95"
                >
                  Pause Audio
                </button>
              )}
            </div>

            {/* Advance to Quiz Notice */}
            <div className="mt-6 pt-6 border-t border-sky-100 w-full flex flex-col items-center">
              <p className="text-xs text-slate-500 mb-3 font-semibold">
                Note: In IELTS listening, once the quiz starts, audio replay will be turned off!
              </p>
              <button
                onClick={handleStartQuiz}
                disabled={!hasListenedAtLeastOnce && !isNarrating}
                className={`py-3.5 px-8 rounded-2xl font-black text-lg shadow-lg flex items-center gap-2 transition ${
                  hasListenedAtLeastOnce || isNarrating
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Ready! Start Questions</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= STEP 3: QUIZ QUESTION ONE-BY-ONE ================= */}
      {phase === 'quiz_question' && activeQuestion && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-3xl border-4 border-sky-300 shadow-xl p-6 sm:p-8">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-sky-700 uppercase">
                Question {currentQuestionIndex + 1} of {activeStory.questions.length}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                No replay during quiz
              </span>
            </div>

            {/* Question Text with Read Question button */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-sky-950 font-['Fredoka']">
                {activeQuestion.question}
              </h2>
              <button
                onClick={() => speakText(activeQuestion.question, undefined, undefined, tier)}
                className="p-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 transition shrink-0"
                title="Hear question read aloud"
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </div>

            {/* Basic Tier: Large Multiple Choice */}
            {tier === 'Basic' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {activeQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      sfx.playPop();
                      setSelectedOptionIndex(idx);
                    }}
                    className={`p-5 rounded-2xl border-4 text-left font-bold text-lg font-['Fredoka'] transition flex items-center justify-between ${
                      selectedOptionIndex === idx
                        ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-md scale-101'
                        : 'bg-white border-sky-100 hover:border-sky-300 text-slate-800'
                    }`}
                  >
                    <span>{option}</span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                        selectedOptionIndex === idx
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedOptionIndex === idx && '✓'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Intermediate & Advanced: Spoken Answer with option fallback */
              <div className="space-y-4 mb-6">
                <div className="p-6 rounded-2xl bg-sky-50 border-2 border-sky-200 text-center">
                  <p className="text-sm font-semibold text-sky-900 mb-3">
                    Speak your answer out loud! Barnaby checks your comprehension gently.
                  </p>

                  <div className="flex justify-center mb-3">
                    {!isRecordingAnswer ? (
                      <button
                        onClick={handleRecordSpokenAnswer}
                        className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base shadow-md flex items-center gap-2 transition"
                      >
                        <Mic className="w-5 h-5" />
                        Tap & Speak Your Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecordingAnswer}
                        className="py-3 px-6 rounded-2xl bg-rose-500 text-white font-bold text-base shadow-md flex items-center gap-2 animate-pulse"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Stop Recording
                      </button>
                    )}
                  </div>

                  {spokenAnswer && (
                    <div className="p-3 bg-white rounded-xl border border-sky-200 text-sm font-medium text-sky-950">
                      Heard: "{spokenAnswer}"
                    </div>
                  )}
                </div>

                {/* Quick tap options fallback */}
                <div className="text-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">
                    Or select an answer option:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {activeQuestion.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          sfx.playPop();
                          setSelectedOptionIndex(idx);
                        }}
                        className={`p-3 rounded-xl border-2 text-left text-sm font-bold transition ${
                          selectedOptionIndex === idx
                            ? 'bg-blue-50 border-blue-500 text-blue-950'
                            : 'bg-white border-sky-100 text-slate-700 hover:border-sky-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Done button to advance */}
            <div className="flex justify-end pt-4 border-t border-sky-100">
              <button
                onClick={handleSubmitAnswer}
                disabled={evaluatingAnswer || (selectedOptionIndex === null && !spokenAnswer)}
                className={`py-3.5 px-8 rounded-2xl font-black text-lg shadow-lg flex items-center gap-2 transition ${
                  selectedOptionIndex !== null || spokenAnswer
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>{evaluatingAnswer ? 'Checking...' : 'Done!'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= STEP 4: QUESTION FEEDBACK ================= */}
      {phase === 'question_feedback' && feedback && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="bg-white rounded-3xl border-4 border-sky-300 shadow-xl p-6 sm:p-8 text-center max-w-lg mx-auto">
            <div
              className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl mb-4 ${
                feedback.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {feedback.isCorrect ? '🌟' : '💡'}
            </div>

            <h2 className="text-3xl font-black text-sky-950 font-['Fredoka'] mb-2">
              {feedback.praise}
            </h2>

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sm text-sky-900 font-medium mb-6">
              <span className="font-bold">Story Detail: </span>
              {feedback.explanation}
            </div>

            <button
              onClick={handleNextQuestion}
              className="w-full py-4 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl flex items-center justify-center gap-2 transition"
            >
              <span>Next Question</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ================= STEP 5: LISTENING SUMMARY ================= */}
      {phase === 'summary' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border-4 border-sky-300 shadow-2xl p-6 sm:p-10 text-center max-w-xl mx-auto space-y-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-blue-100 border-2 border-blue-300 flex items-center justify-center text-5xl shadow-inner">
            🐨
          </div>

          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-sky-950 font-['Fredoka']">
              Super Listener Award!
            </h2>
            <p className="text-base text-sky-800 font-medium mt-1">
              You listened with sharp ears and aced the comprehension questions!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200">
              <div className="text-xs text-sky-700 font-bold uppercase">Questions Correct</div>
              <div className="text-2xl font-black text-sky-950 font-['Fredoka']">
                {correctCount} / {activeStory.questions.length}
              </div>
            </div>
            <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200">
              <div className="text-xs text-sky-700 font-bold uppercase">Points Earned</div>
              <div className="text-2xl font-black text-sky-950 font-['Fredoka']">
                +140 pts
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Unlocked "Space Koala" sticker in your Backpack!</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => {
                sfx.playPop();
                setPhase('story_selection');
              }}
              className="px-6 py-3 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Listen to Another Story
            </button>
            <button
              onClick={() => {
                sfx.playPop();
                onBackToHome();
              }}
              className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition"
            >
              Next Module (Speaking)
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
