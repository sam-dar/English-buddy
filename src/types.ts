export type DifficultyTier = 'Basic' | 'Intermediate' | 'Advanced';

export type AppModule = 'home' | 'reading' | 'listening' | 'speaking' | 'rewards';

export type ActivityMode = 'practice' | 'quiz';

export interface Sticker {
  id: string;
  name: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
  requirement: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  unlockedAt?: string;
}

export interface UserStats {
  points: number;
  streakDays: number;
  readingsCompleted: number;
  listeningCompleted: number;
  speakingCompleted: number;
  stickers: Sticker[];
  badges: Badge[];
}

export interface FlaggedWord {
  word: string;
  index: number;
  reason: 'mispronounced' | 'skipped' | 'substituted';
  childSaid?: string;
  mastered?: boolean;
}

export interface ReadingPassage {
  id: string;
  title: string;
  text: string;
  tier: DifficultyTier;
  imageUrl?: string;
}

export interface ListeningQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  spokenAnswerHint: string;
}

export interface ListeningStory {
  id: string;
  title: string;
  passage: string;
  tier: DifficultyTier;
  questions: ListeningQuestion[];
}

export interface SpeakingPart1Prompt {
  id: string;
  title: string;
  question: string;
  hints: string[];
  sampleAnswer: string;
}

export interface SpeakingPart2Topic {
  id: string;
  topic: string;
  cueCard: string[];
  wordBank: string[];
  prepTimeSeconds: {
    Basic: number;
    Intermediate: number;
    Advanced: number;
  };
  durationSeconds: {
    Basic: number;
    Intermediate: number;
    Advanced: number;
  };
}

export interface SpeakingPart3Question {
  id: string;
  question: string;
  followUp: string;
  tip: string;
}

export interface WordOfTheDay {
  word: string;
  tier: DifficultyTier;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  sampleSentence: string;
  funFact?: string;
  emoji: string;
}

export interface StoryChoiceOption {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface StoryContinuation {
  choiceId: string;
  choiceTitle: string;
  continuationText: string;
  moralOrFunFact: string;
}

export interface JournalPrompt {
  id: string;
  emoji: string;
  question: string;
  starter: string;
}

export interface SpeakingJournalEntry {
  id: string;
  date: string;
  prompt: string;
  transcript: string;
  durationSeconds: number;
  journalTitle: string;
  moodEmoji: string;
  gentleResponse: string;
  encouragementHighlight: string;
  celebrationBadge: string;
}
