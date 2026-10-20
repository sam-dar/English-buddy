import {
  DifficultyTier,
  ListeningStory,
  ReadingPassage,
  SpeakingPart1Prompt,
  SpeakingPart2Topic,
  SpeakingPart3Question,
  Sticker,
  Badge,
  WordOfTheDay,
  StoryChoiceOption,
} from '../types';

// ----------------------------------------------------
// 1. SAMPLE TEXTBOOK PAGES FOR OCR & READING
// ----------------------------------------------------
export const SAMPLE_TEXTBOOK_PAGES: ReadingPassage[] = [
  {
    id: 'basic-sample-1',
    title: 'The Sunny Meadow (Page 12)',
    tier: 'Basic',
    text: 'A little brown puppy ran across the green grass. He saw a yellow butterfly fluttering near a red flower. "Woof!" barked the happy puppy. The butterfly flew high into the warm sky.',
  },
  {
    id: 'basic-sample-2',
    title: 'Sammy the Snail (Page 15)',
    tier: 'Basic',
    text: 'Sammy is a tiny garden snail. He carries his round house on his back. When gentle rain falls, Sammy drinks a fresh raindrop. Then he smiles and plays with his ant friends.',
  },
  {
    id: 'inter-sample-1',
    title: 'The Secret in the Treehouse (Page 44)',
    tier: 'Intermediate',
    text: 'Maya and Leo climbed the wooden ladder to their secret backyard treehouse. Inside an old wooden trunk, they discovered a dusty map with mysterious compass drawings. The map showed three secret stepping stones leading toward the old willow tree by the sparkling river.',
  },
  {
    id: 'inter-sample-2',
    title: 'The Coral Reef Adventure (Page 52)',
    tier: 'Intermediate',
    text: 'Deep beneath the ocean surface, bright clownfish glide gracefully between wavy sea anemones. Coral reefs are bustling underwater cities that shelter thousands of colorful marine creatures. Marine scientists protect these vibrant ecosystems so ocean animals can flourish safely.',
  },
  {
    id: 'adv-sample-1',
    title: 'Voyage to the Red Planet (Page 98)',
    tier: 'Advanced',
    text: 'Robotic rovers navigate the rugged terrain of Mars, transmitting detailed high-resolution photographs back to mission control on Earth. These autonomous scientific vehicles analyze Martian soil and rock samples to determine whether microscopic organisms ever existed in the planet’s ancient river valleys billions of years ago.',
  },
];

// ----------------------------------------------------
// 2. INTERACTIVE STORY CHOICES (Reading Module Continuation)
// ----------------------------------------------------
export const SAMPLE_STORY_CHOICES: Record<string, StoryChoiceOption[]> = {
  default: [
    {
      id: 'explore-cave',
      emoji: '🔦',
      title: 'Explore the Mysterious Cave',
      description: 'Step inside to see what sparkles in the shadows!',
    },
    {
      id: 'follow-butterfly',
      emoji: '🦋',
      title: 'Follow the Golden Butterfly',
      description: 'Chasing the fluttering wings across the sunny meadow!',
    },
    {
      id: 'build-shelter',
      emoji: '🏕️',
      title: 'Build a Secret Tree Fort',
      description: 'Gather friendly forest animals to build a cozy hideout!',
    },
  ],
};

// ----------------------------------------------------
// 3. CURATED LISTENING STORIES
// ----------------------------------------------------
export const LISTENING_STORIES: ListeningStory[] = [
  {
    id: 'listen-basic-1',
    title: 'Barnaby and the Rainbow Balloon',
    tier: 'Basic',
    passage:
      'Barnaby Bear woke up on a sunny morning. He found a giant rainbow balloon tied to his front door. The balloon bobbed in the breeze. Barnaby walked to the playground and shared the balloon with his friend Pip the Penguin. They played hopscotch until lunchtime.',
    questions: [
      {
        id: 'q1',
        question: 'What did Barnaby find at his front door?',
        options: ['A box of cookies', 'A rainbow balloon', 'A red bicycle', 'A toy robot'],
        correctIndex: 1,
        spokenAnswerHint: 'A rainbow balloon was tied to his front door.',
      },
      {
        id: 'q2',
        question: 'Who did Barnaby share the balloon with?',
        options: ['Pip the Penguin', 'Leo the Lion', 'Sammy the Snail', 'His teacher'],
        correctIndex: 0,
        spokenAnswerHint: 'He shared the balloon with Pip the Penguin.',
      },
      {
        id: 'q3',
        question: 'What game did they play at the playground?',
        options: ['Hide and seek', 'Hopscotch', 'Soccer', 'Tag'],
        correctIndex: 1,
        spokenAnswerHint: 'They played hopscotch.',
      },
    ],
  },
  {
    id: 'listen-inter-1',
    title: 'The Great Telescope Discovery',
    tier: 'Intermediate',
    passage:
      'Yesterday, Oliver’s class visited the city observatory. The astronomer pointed a gigantic silver telescope toward the night sky. When Oliver peeked through the glass lens, he saw Saturn surrounded by brilliant glowing rings. The astronomer explained that Saturn’s rings are made of billions of tiny ice chunks and dusty rocks reflecting sunlight.',
    questions: [
      {
        id: 'q1',
        question: 'Where did Oliver and his classmates go yesterday?',
        options: ['To a science museum', 'To the city observatory', 'To a spaceship', 'To the planetarium library'],
        correctIndex: 1,
        spokenAnswerHint: 'They visited the city observatory.',
      },
      {
        id: 'q2',
        question: 'Which planet did Oliver see through the telescope?',
        options: ['Mars', 'Saturn', 'Jupiter', 'Neptune'],
        correctIndex: 1,
        spokenAnswerHint: 'He saw Saturn and its rings.',
      },
      {
        id: 'q3',
        question: 'What are Saturn’s rings mostly made of?',
        options: ['Gold and diamonds', 'Ice chunks and dusty rocks', 'Starlight and clouds', 'Liquid water'],
        correctIndex: 1,
        spokenAnswerHint: 'The rings are made of ice chunks and dust reflecting sunlight.',
      },
    ],
  },
  {
    id: 'listen-adv-1',
    title: 'Renewable Energy on Eco-Island',
    tier: 'Advanced',
    passage:
      'Eco-Island is a pioneering coastal community that generates one hundred percent of its electrical power through renewable energy. Along the windy northern cliffs, a farm of sleek wind turbines harnesses steady ocean breezes. Meanwhile, high-efficiency solar arrays cover municipal rooftops, feeding clean electricity directly into a centralized smart battery grid. By eliminating fossil fuel dependence, the island has achieved carbon neutrality while protecting its pristine wildlife sanctuary.',
    questions: [
      {
        id: 'q1',
        question: 'How does Eco-Island produce all of its electrical power?',
        options: ['Through coal power plants', 'Through 100% renewable energy', 'By importing gas', 'With diesel generators'],
        correctIndex: 1,
        spokenAnswerHint: 'Through renewable energy like wind and solar power.',
      },
      {
        id: 'q2',
        question: 'Where are the wind turbines positioned on the island?',
        options: ['On the southern beach', 'Along the windy northern cliffs', 'In the city center', 'Under the water'],
        correctIndex: 1,
        spokenAnswerHint: 'Along the windy northern cliffs.',
      },
      {
        id: 'q3',
        question: 'What major environmental achievement did the island accomplish?',
        options: ['Building a larger harbor', 'Achieving carbon neutrality', 'Creating a zoo', 'Growing wheat'],
        correctIndex: 1,
        spokenAnswerHint: 'It achieved carbon neutrality and protected its wildlife sanctuary.',
      },
    ],
  },
];

// ----------------------------------------------------
// 4. SPEAKING MODULE DATA
// ----------------------------------------------------
export const SPEAKING_PART_1_PROMPTS: SpeakingPart1Prompt[] = [
  {
    id: 'p1-about-me',
    title: 'All About You',
    question: 'Hello! Can you tell me your name, how old you are, and where you live?',
    hints: ['My name is...', 'I am ... years old', 'I live in a city called...'],
    sampleAnswer: 'Hello! My name is Lily. I am eight years old, and I live in sunny Seattle with my family.',
  },
  {
    id: 'p1-favorite-animal',
    title: 'Your Favorite Animal',
    question: 'What is your favorite animal, and why do you like it so much?',
    hints: ['My favorite animal is...', 'It is special because...', 'I love how it...'],
    sampleAnswer: 'My favorite animal is a dolphin because they are super smart, playful, and love leaping in the ocean!',
  },
  {
    id: 'p1-school-hobby',
    title: 'School & Fun Activities',
    question: 'What is your favorite subject or game to play at school?',
    hints: ['At school, I really like...', 'During playtime, my friends and I...', 'It makes me feel happy because...'],
    sampleAnswer: 'At school, I love art class because I can paint colorful pictures of outer space and rocket ships.',
  },
];

export const SPEAKING_PART_2_TOPICS: SpeakingPart2Topic[] = [
  {
    id: 'topic-favorite-toy',
    topic: 'Talk about a toy or game that you love playing with.',
    cueCard: [
      'What the toy or game is',
      'When you received it or started playing it',
      'Who you usually play with',
      'Why it brings you so much joy',
    ],
    wordBank: ['colorful', 'exciting', 'imagination', 'building', 'favorite', 'fun', 'challenge'],
    prepTimeSeconds: { Basic: 10, Intermediate: 25, Advanced: 45 },
    durationSeconds: { Basic: 30, Intermediate: 45, Advanced: 60 },
  },
  {
    id: 'topic-dream-pet',
    topic: 'Talk about your dream pet or a pet you care for.',
    cueCard: [
      'What kind of pet it would be',
      'What name you would give it',
      'How you would feed and play with it',
      'Why you chose this animal',
    ],
    wordBank: ['furry', 'cuddly', 'energetic', 'gentle', 'care', 'playful', 'best friend'],
    prepTimeSeconds: { Basic: 10, Intermediate: 25, Advanced: 45 },
    durationSeconds: { Basic: 30, Intermediate: 45, Advanced: 60 },
  },
  {
    id: 'topic-unforgettable-day',
    topic: 'Talk about a memorable day or trip you enjoyed with your family.',
    cueCard: [
      'Where you went and who was with you',
      'What exciting things you saw or did',
      'What yummy food you tasted',
      'Why that day was so special to you',
    ],
    wordBank: ['adventure', 'scenic', 'delicious', 'laughter', 'celebration', 'unforgettable'],
    prepTimeSeconds: { Basic: 15, Intermediate: 30, Advanced: 50 },
    durationSeconds: { Basic: 30, Intermediate: 45, Advanced: 60 },
  },
];

export const SPEAKING_PART_3_CONVERSATIONS: { topic: string; questions: SpeakingPart3Question[] }[] = [
  {
    topic: 'Friendship and Sharing',
    questions: [
      {
        id: 'p3-q1',
        question: 'Why do you think it is important for friends to share their toys and games?',
        followUp: 'How do you feel when a friend shares something special with you?',
        tip: 'Try saying: "When friends share, it shows they care and it makes playing together twice as fun!"',
      },
      {
        id: 'p3-q2',
        question: 'What makes someone a really good friend?',
        followUp: 'Can you tell me about a kind thing a friend did for you recently?',
        tip: 'Try using words like "kindness", "listening", and "support".',
      },
      {
        id: 'p3-q3',
        question: 'If two friends disagree about which game to play, how can they solve it peacefully?',
        followUp: 'Taking turns or flipping a coin can be great solutions!',
        tip: 'Try saying: "They can take turns or invent a brand new game together!"',
      },
    ],
  },
  {
    topic: 'Caring for Nature & Animals',
    questions: [
      {
        id: 'p3-q1-nature',
        question: 'How can children help keep parks, gardens, and playgrounds clean?',
        followUp: 'What should someone do if they see trash on the grass?',
        tip: 'Try saying: "We can pick up litter and recycle bottles so animals stay safe."',
      },
      {
        id: 'p3-q2-nature',
        question: 'Why do you think trees and flowers are so important for our planet?',
        followUp: 'Do trees help birds and squirrels too?',
        tip: 'Try mentioning fresh air, oxygen, and cozy homes for wildlife.',
      },
      {
        id: 'p3-q3-nature',
        question: 'If you could invent a machine to help animals, what would it do?',
        followUp: 'That sounds amazing! How would it help them?',
        tip: 'Let your imagination soar! Even flying animal ambulances or water cleaners!',
      },
    ],
  },
];

// ----------------------------------------------------
// 5. WORD OF THE DAY CURRICULUM (Per Tier)
// ----------------------------------------------------
export const WORDS_OF_THE_DAY: Record<DifficultyTier, WordOfTheDay[]> = {
  Basic: [
    {
      word: 'Giggle',
      tier: 'Basic',
      phonetic: 'GIG-uhl',
      partOfSpeech: 'verb / noun',
      definition: 'To laugh in a silly, happy, or bubbly way.',
      sampleSentence: 'The funny puppet made all the children giggle with joy.',
      funFact: 'Giggling releases happy signals in your brain that make you smile!',
      emoji: '😄',
    },
    {
      word: 'Brave',
      tier: 'Basic',
      phonetic: 'BRAYV',
      partOfSpeech: 'adjective',
      definition: 'Ready to try new things even when feeling a little nervous.',
      sampleSentence: 'Leo was very brave when he climbed the tallest playground slide.',
      funFact: 'Being brave doesn’t mean not being scared—it means trying anyway!',
      emoji: '🦁',
    },
    {
      word: 'Flutter',
      tier: 'Basic',
      phonetic: 'FLUT-er',
      partOfSpeech: 'verb',
      definition: 'To flap wings lightly, quickly, and gracefully.',
      sampleSentence: 'The blue butterfly fluttered softly over the golden sunflower.',
      funFact: 'Butterflies taste flowers using tiny sensors on their feet!',
      emoji: '🦋',
    },
    {
      word: 'Shimmer',
      tier: 'Basic',
      phonetic: 'SHIM-er',
      partOfSpeech: 'verb',
      definition: 'To shine with a soft, gentle, glowing light.',
      sampleSentence: 'The morning ocean began to shimmer under the warm sunrise.',
      funFact: 'Fish scales shimmer to camouflage themselves from hungry seagulls.',
      emoji: '✨',
    },
  ],
  Intermediate: [
    {
      word: 'Curious',
      tier: 'Intermediate',
      phonetic: 'KYOOR-ee-us',
      partOfSpeech: 'adjective',
      definition: 'Eager to know, discover, or explore how things work.',
      sampleSentence: 'The curious scientist investigated the mysterious glowing rock.',
      funFact: 'Curiosity helps kids learn languages twice as quickly!',
      emoji: '🔍',
    },
    {
      word: 'Vibrant',
      tier: 'Intermediate',
      phonetic: 'VY-bruhnt',
      partOfSpeech: 'adjective',
      definition: 'Full of lively energy, bright colors, and excitement.',
      sampleSentence: 'The coral reef was filled with vibrant yellow and purple fish.',
      funFact: 'Peacock feathers appear vibrant due to microscopic light reflections!',
      emoji: '🎨',
    },
    {
      word: 'Persevere',
      tier: 'Intermediate',
      phonetic: 'pur-suh-VEER',
      partOfSpeech: 'verb',
      definition: 'To keep trying your best even when a task feels difficult.',
      sampleSentence: 'If you persevere through tricky words, reading becomes effortless.',
      funFact: 'Thomas Edison tried over a thousand times before perfecting the light bulb!',
      emoji: '🧗‍♂️',
    },
  ],
  Advanced: [
    {
      word: 'Eloquent',
      tier: 'Advanced',
      phonetic: 'EL-uh-kwuhnt',
      partOfSpeech: 'adjective',
      definition: 'Fluent, persuasive, and beautifully expressive in speech or writing.',
      sampleSentence: 'The young speaker gave an eloquent presentation on protecting wildlife.',
      funFact: 'The word comes from Latin "eloqui", meaning to speak clearly from the heart.',
      emoji: '🎙️',
    },
    {
      word: 'Resilient',
      tier: 'Advanced',
      phonetic: 'ri-ZIL-yuhnt',
      partOfSpeech: 'adjective',
      definition: 'Able to recover quickly from challenges and spring back stronger.',
      sampleSentence: 'Young seedlings are remarkably resilient even after heavy autumn rainstorms.',
      funFact: 'Bamboo is one of the most resilient plants—it bends in storms without breaking.',
      emoji: '🌱',
    },
    {
      word: 'Magnificent',
      tier: 'Advanced',
      phonetic: 'mag-NIF-uh-suhnt',
      partOfSpeech: 'adjective',
      definition: 'Extremely impressive, beautiful, grand, and inspiring.',
      sampleSentence: 'The space telescope captured a magnificent view of the spiral galaxy.',
      funFact: 'The aurora borealis is considered one of Earth’s most magnificent natural lights.',
      emoji: '🌌',
    },
  ],
};

// ----------------------------------------------------
// 6. STICKER BOOK & BADGES
// ----------------------------------------------------
export const INITIAL_STICKERS: Sticker[] = [
  {
    id: 'stk-golden-pup',
    name: 'Golden Pup',
    icon: '🐶',
    color: 'from-amber-300 to-yellow-500',
    unlocked: true,
    unlockedAt: 'Welcome Gift',
    requirement: 'Joined English Buddy adventure!',
  },
  {
    id: 'stk-reading-owl',
    name: 'Professor Owl',
    icon: '🦉',
    color: 'from-blue-300 to-indigo-500',
    unlocked: false,
    requirement: 'Complete 1 textbook reading practice.',
  },
  {
    id: 'stk-space-koala',
    name: 'Space Koala',
    icon: '🐨',
    color: 'from-purple-300 to-violet-600',
    unlocked: false,
    requirement: 'Listen to a listening story and answer questions.',
  },
  {
    id: 'stk-brave-lion',
    name: 'Brave Leo',
    icon: '🦁',
    color: 'from-orange-300 to-amber-500',
    unlocked: false,
    requirement: 'Complete IELTS Speaking Part 1 or Part 2.',
  },
  {
    id: 'stk-word-star',
    name: 'Vocabulary Star',
    icon: '🌟',
    color: 'from-yellow-200 to-amber-400',
    unlocked: false,
    requirement: 'Practice the Word of the Day for 3 days!',
  },
  {
    id: 'stk-story-teller',
    name: 'Story Weaver',
    icon: '🪄',
    color: 'from-pink-300 to-rose-500',
    unlocked: false,
    requirement: 'Make an interactive story continuation choice.',
  },
  {
    id: 'stk-rainbow-comet',
    name: 'Rainbow Comet',
    icon: '☄️',
    color: 'from-cyan-300 to-blue-500',
    unlocked: false,
    requirement: 'Earn 300 total buddy points.',
  },
  {
    id: 'stk-cupcake-fox',
    name: 'Pip the Fox',
    icon: '🦊',
    color: 'from-emerald-300 to-teal-500',
    unlocked: false,
    requirement: 'Try a challenge in Intermediate or Advanced tier.',
  },
];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'bdg-first-step',
    title: 'First Words',
    description: 'Started your English Buddy journey!',
    icon: '🚀',
    earned: true,
  },
  {
    id: 'bdg-phonics-explorer',
    title: 'Phonics Explorer',
    description: 'Read a textbook page and mastered flagged words.',
    icon: '📖',
    earned: false,
  },
  {
    id: 'bdg-star-listener',
    title: 'Super Listener',
    description: 'Finished a listening comprehension round.',
    icon: '🎧',
    earned: false,
  },
  {
    id: 'bdg-brave-speaker',
    title: 'Confident Speaker',
    description: 'Delivered an IELTS monologue with Barnaby.',
    icon: '🎤',
    earned: false,
  },
  {
    id: 'bdg-word-master',
    title: 'Word Wizard',
    description: 'Practiced Word of the Day 3 times.',
    icon: '⚡',
    earned: false,
  },
  {
    id: 'bdg-streak-champ',
    title: 'Daily Streak Star',
    description: 'Practiced English with encouragement!',
    icon: '🔥',
    earned: false,
  },
];
