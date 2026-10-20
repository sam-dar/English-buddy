import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Rate-limiting / simple in-memory request throttle cache
const requestLog = new Map<string, number>();
function isThrottled(key: string, minIntervalMs = 800): boolean {
  const now = Date.now();
  const last = requestLog.get(key) || 0;
  if (now - last < minIntervalMs) {
    return true;
  }
  requestLog.set(key, now);
  return false;
}

// ----------------------------------------------------
// 1. OCR ENDPOINT: Extract text from textbook photo & check difficulty
// ----------------------------------------------------
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', currentTier = 'Basic' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        reason: 'missing_image',
        message: 'No photo was provided. Please upload or capture a textbook page.',
      });
    }

    if (!ai) {
      // Fallback response if no API key is present
      return res.json({
        success: true,
        text: 'The little yellow duck swam across the blue pond. It met a green frog on a leaf. "Quack! Hello friend," said the duck. They played until the sun went down.',
        detectedTier: 'Basic',
        isMismatch: currentTier !== 'Basic',
        mismatchAdvice: currentTier !== 'Basic' ? `This passage matches the Basic tier, while you have chosen ${currentTier}.` : null,
        wordCount: 33,
        words: ['The', 'little', 'yellow', 'duck', 'swam', 'across', 'the', 'blue', 'pond', 'It', 'met', 'a', 'green', 'frog', 'on', 'a', 'leaf', 'Quack', 'Hello', 'friend', 'said', 'the', 'duck', 'They', 'played', 'until', 'the', 'sun', 'went', 'down'],
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: `You are an expert reading assistant in "English Buddy," an IELTS-style English app for kids aged 6 to 12.
Analyze this photo of a textbook page.
Target Difficulty Tier chosen by child: "${currentTier}".
- "Basic" is for age ~6 (early reader, short simple sentences, high-frequency sight words, 20-50 words).
- "Intermediate" is for age ~10 (grade 3-4 level, compound sentences, 50-120 words).
- "Advanced" is for age 12+ (multi-paragraph, varied vocabulary, 100-200 words).

Check image clarity:
1. If the photo is too blurry, too dark, heavily cut off, unreadable, or doesn't contain readable English text, set "isReadable": false and give a friendly, helpful suggestion for the child/parent to retake the photo.
2. If readable: extract the English reading passage cleanly, preserving sentence order. Omit side page numbers, ISBNs, exercise question labels, or irrelevant publisher margins.
3. Determine the detected reading tier ("Basic", "Intermediate", or "Advanced").
4. Compare with the child's chosen tier ("${currentTier}"). If it differs, set "isMismatch": true and write a warm, encouraging kid-friendly advice message (e.g., "This story looks a little challenging for Basic! Do you want to try anyway, or find a simpler page?").

Return ONLY valid JSON matching this schema:
{
  "isReadable": boolean,
  "unreadableReason": string or null,
  "extractedText": string,
  "detectedTier": "Basic" | "Intermediate" | "Advanced",
  "isMismatch": boolean,
  "mismatchAdvice": string or null,
  "wordCount": number,
  "keyWords": string[]
}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawJson = response.text?.trim() || '{}';
    let data;
    try {
      data = JSON.parse(rawJson);
    } catch {
      return res.status(500).json({
        success: false,
        reason: 'parse_error',
        message: 'Could not process the textbook photo. Please try snapping another photo.',
      });
    }

    if (!data.isReadable || !data.extractedText || data.extractedText.trim().length < 10) {
      return res.json({
        success: false,
        reason: 'blurry_or_unreadable',
        message:
          data.unreadableReason ||
          "The photo seems a little blurry or dark. Hold the camera steady with good light and let's try another snap!",
      });
    }

    return res.json({
      success: true,
      text: data.extractedText.trim(),
      detectedTier: data.detectedTier || currentTier,
      isMismatch: !!data.isMismatch,
      mismatchAdvice: data.mismatchAdvice,
      wordCount: data.wordCount || data.extractedText.split(/\s+/).length,
      keyWords: data.keyWords || [],
    });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return res.status(500).json({
      success: false,
      reason: 'api_error',
      message: 'We had a little trouble reading that page. Let us try once more!',
    });
  }
});

// In-memory TTS audio cache and quota tracker
const ttsAudioCache = new Map<string, string>();
let ttsQuotaExceededUntil = 0;

// ----------------------------------------------------
// 2. TTS ENDPOINT: Text-to-speech for narration & pronunciation
// ----------------------------------------------------
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Puck' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const trimmedText = text.trim().slice(0, 800);
    const cacheKey = `${voice}_${trimmedText.toLowerCase()}`;

    // Return cached audio if already generated
    if (ttsAudioCache.has(cacheKey)) {
      return res.json({
        audioBase64: ttsAudioCache.get(cacheKey),
        mimeType: 'audio/wav',
      });
    }

    // If quota was previously exceeded, instruct frontend to use Web Speech Synthesis
    if (Date.now() < ttsQuotaExceededUntil || !ai) {
      return res.json({
        fallback: true,
        reason: 'quota_exceeded',
        message: 'Using client Web Speech Synthesis for instant playback',
      });
    }

    // Rate-limiting check for repeated rapid clicks
    const clientKey = req.ip || 'global';
    if (isThrottled(`tts_${clientKey}`, 500)) {
      return res.json({
        fallback: true,
        reason: 'throttled',
        message: 'Using client Web Speech Synthesis for smooth playback',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style: 'Gentle, friendly, clear storytelling teacher for kids with warm encouraging tone and moderate pacing.',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice === 'Kore' ? 'Kore' : 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({
        fallback: true,
        reason: 'no_audio',
        message: 'Using client Web Speech Synthesis',
      });
    }

    // Cache the audio base64 to save future quota
    ttsAudioCache.set(cacheKey, base64Audio);

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    const errorStr = String(error?.message || error || '');
    const isQuota =
      error?.status === 429 ||
      errorStr.includes('429') ||
      errorStr.includes('quota') ||
      errorStr.includes('RESOURCE_EXHAUSTED');

    if (isQuota) {
      // Back off for 1 hour so server doesn't spam quota
      ttsQuotaExceededUntil = Date.now() + 60 * 60 * 1000;
      console.info('[TTS] Free-tier daily quota limit reached on Gemini TTS. Automatically routing all speech to high-quality browser Web Speech Synthesis.');
      return res.json({
        fallback: true,
        reason: 'quota_exceeded',
        message: 'Switched to browser speech synthesis',
      });
    }

    console.warn('[TTS] Generation failed, using client speech fallback:', error?.message || error);
    return res.json({
      fallback: true,
      reason: 'api_fallback',
      message: 'Using browser speech synthesis',
    });
  }
});

// ----------------------------------------------------
// 3. EVALUATE LISTENING: Lenient semantic comprehension grading
// ----------------------------------------------------
app.post('/api/evaluate-listening', async (req, res) => {
  try {
    const { question, correctAnswerHint, childAnswer, tier = 'Basic' } = req.body;

    if (!childAnswer || !question) {
      return res.status(400).json({ error: 'Missing question or answer.' });
    }

    if (!ai) {
      // Local fallback lenient check
      const normalizedChild = (childAnswer || '').toLowerCase().trim();
      const normalizedHint = (correctAnswerHint || '').toLowerCase().trim();
      const words = normalizedHint.split(/\s+/).filter((w: string) => w.length > 2);
      const match = words.some((w: string) => normalizedChild.includes(w)) || normalizedChild.length > 3;

      return res.json({
        isCorrect: match,
        praise: match ? 'Awesome listening! You captured the story perfectly!' : 'Nice try! You were super close!',
        kidExplanation: `The story mentioned: ${correctAnswerHint}`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an encouraging IELTS teacher for kids aged 6-12 assessing listening comprehension.
This is a LISTENING test, NOT a speaking test.
Grade strictly on whether the child understood the KEY CONCEPT / MEANING of the story.
DO NOT penalize for:
- Grammar slips, accent, simple kid vocabulary, or spelling/transcription stumbles.
- Incomplete sentences (e.g. saying just "in the garden" instead of "He went in the garden" is 100% correct).
Tier: ${tier}
Question: "${question}"
Target Key Concept / Expected Meaning: "${correctAnswerHint}"
Child's Answer: "${childAnswer}"

Return ONLY JSON:
{
  "isCorrect": boolean,
  "praise": string (one short, warm, celebratory sentence for a child),
  "kidExplanation": string (one gentle sentence explaining what happened in the story)
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      isCorrect: typeof result.isCorrect === 'boolean' ? result.isCorrect : true,
      praise: result.praise || 'Great listening buddy!',
      kidExplanation: result.kidExplanation || `The story said: ${correctAnswerHint}`,
    });
  } catch (error: any) {
    console.error('Evaluate Listening Error:', error);
    return res.json({
      isCorrect: true,
      praise: 'Super job listening and sharing your answer!',
      kidExplanation: 'You are doing great!',
    });
  }
});

// ----------------------------------------------------
// 4. POLISH SPEAKING: Reconstruct polished version & encouraging coaching
// ----------------------------------------------------
app.post('/api/polish-speaking', async (req, res) => {
  try {
    const {
      transcript = '',
      promptTitle = 'Speaking Task',
      part = 1,
      durationSeconds = 0,
      targetDuration = 30,
      tier = 'Basic',
      mode = 'quiz',
    } = req.body;

    if (!ai || !transcript || transcript.trim().length === 0) {
      return res.json({
        polishedText: transcript
          ? `I love talking about this because it makes me happy!`
          : `Hello, my name is Alex and I am excited to learn English!`,
        praise: `You spoke for ${durationSeconds} seconds! Fantastic confidence!`,
        coachingTip: durationSeconds < targetDuration * 0.7
          ? `Next time, try to add one more detail to keep going a little longer!`
          : `You kept speaking right on target. That was marvelous!`,
        highlights: ['Clear voice', 'Great enthusiasm'],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are Barnaby, a warm, cheering mascot and IELTS speaking coach for kids aged 6-12 in "English Buddy".
Speaking Task: Part ${part} - "${promptTitle}"
Mode: ${mode}
Child's Tier: ${tier}
Time Spoke: ${durationSeconds} seconds (Target was ~${targetDuration} seconds).
What the child said: "${transcript}"

Philosophy:
- Build confidence! DO NOT give harsh numeric grades or rank fluency harshly.
- Reconstruct a polished, natural kid version of what the child said that preserves their original ideas but with clean grammar and smooth phrasing suitable for a ${tier} learner.
- The child will practice repeating this polished version back.
- If they spoke for less than the target time, give a kind, encouraging tip like "You spoke for ${durationSeconds} seconds — try to add one more favorite thing next time to keep going a bit longer!"
- If they met or exceeded the time, celebrate their stamina!

Return ONLY JSON:
{
  "polishedText": string (a natural, 1-3 sentence polished version of what they said),
  "praise": string (enthusiastic cheering sentence celebrating their effort),
  "coachingTip": string (friendly practical advice on how to expand next time),
  "highlights": string[] (2 cute things they did great, e.g. "Creative words", "Brave voice")
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      polishedText: result.polishedText || transcript,
      praise: result.praise || `Awesome effort speaking for ${durationSeconds} seconds!`,
      coachingTip: result.coachingTip || 'Keep practicing and your English will shine brighter every day!',
      highlights: result.highlights || ['Super courage', 'Expressive ideas'],
    });
  } catch (error: any) {
    console.error('Polish Speaking Error:', error);
    return res.json({
      polishedText: req.body.transcript || 'I enjoy learning new words every single day!',
      praise: 'You did a wonderful job speaking up today!',
      coachingTip: 'Keep sharing your ideas with a big smile!',
      highlights: ['Great speaking', 'Wonderful energy'],
    });
  }
});

// ----------------------------------------------------
// 5. GENERATE LISTENING PASSAGE (for endless fresh stories)
// ----------------------------------------------------
app.post('/api/generate-listening-passage', async (req, res) => {
  try {
    const { tier = 'Basic', topic = 'animals' } = req.body;

    if (!ai) {
      return res.json({
        title: 'The Friendly Puppy',
        passage:
          'Toby is a fluffy golden puppy. He loves running in the green grass. Today, Toby found a squeaky red ball under the porch. He wagged his tail and brought it to Emma.',
        questions: [
          {
            id: 'q1',
            question: 'What kind of animal is Toby?',
            options: ['A kitten', 'A puppy', 'A bunny', 'A turtle'],
            correctIndex: 1,
            spokenAnswerHint: 'Toby is a puppy.',
          },
          {
            id: 'q2',
            question: 'What color was the squeaky ball?',
            options: ['Blue', 'Yellow', 'Red', 'Green'],
            correctIndex: 2,
            spokenAnswerHint: 'The squeaky ball was red.',
          },
          {
            id: 'q3',
            question: 'Where did Toby find the ball?',
            options: ['In the lake', 'Under the porch', 'In the tree', 'Under the sofa'],
            correctIndex: 1,
            spokenAnswerHint: 'Toby found it under the porch.',
          },
        ],
      });
    }

    const tierPrompt =
      tier === 'Basic'
        ? 'Target age 6: 40-60 words total, very simple sentences, cheerful themes (pets, toys, playground). 3 Multiple Choice questions with 4 options each.'
        : tier === 'Intermediate'
        ? 'Target age 10 (Grade 3): 80-120 words total, narrative story with a mini discovery (science, school field trip, treehouse mystery). 3 questions where answers are short sentences or phrases.'
        : 'Target age 12+: 140-180 words, rich descriptive passage (space exploration, wildlife conservation, historical invention). 3 thoughtful comprehension questions.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a fun, kid-appropriate IELTS listening comprehension passage for "English Buddy".
Tier: ${tier}.
Topic: ${topic}.
Guidelines: ${tierPrompt}

Return ONLY JSON:
{
  "title": string,
  "passage": string,
  "questions": [
    {
      "id": string,
      "question": string,
      "options": string[] (4 options if tier is Basic, or 4 options for quick choice),
      "correctIndex": number (0 to 3),
      "spokenAnswerHint": string (concise expected answer key for speech evaluation)
    }
  ]
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text?.trim() || '{}');
    return res.json(result);
  } catch (error: any) {
    console.error('Generate Listening Passage Error:', error);
    return res.status(500).json({ error: 'Failed to generate passage.' });
  }
});

// ----------------------------------------------------
// 6. INTERACTIVE STORY CONTINUATION (Reading Module)
// ----------------------------------------------------
app.post('/api/story-continuation', async (req, res) => {
  try {
    const { baseText = '', chosenOption = '', tier = 'Basic' } = req.body;

    if (!ai) {
      return res.json({
        continuationText: `Because you chose "${chosenOption}", Barnaby skipped happily down the trail! He discovered a sparkling puddle with three friendly frogs making funny ribbit sounds. Everyone cheered and celebrated together!`,
        funTakeaway: 'Great adventure choice! Curiosity always leads to wonderful discoveries.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an imaginative children's story companion in "English Buddy" (IELTS for kids).
The child just finished reading this passage:
"${baseText.slice(0, 500)}"

The child chose this story path:
"${chosenOption}"

Child Difficulty Tier: "${tier}"
- Basic (age 6): 2-3 simple sentences, lots of fun vivid sound words (splash, whoosh, zoom!), easy words.
- Intermediate (age 10): 3-4 descriptive sentences, adventure and teamwork.
- Advanced (age 12+): 4-5 rich narrative sentences with expressive vocabulary.

Continue the story based on their choice in a heartwarming, exciting way!

Return ONLY JSON:
{
  "continuationText": string,
  "funTakeaway": string (one short cheerful sentence about their choice)
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      continuationText:
        result.continuationText ||
        `Following the choice "${chosenOption}", a wonderful new journey began filled with laughter and friends!`,
      funTakeaway: result.funTakeaway || 'What an awesome branch of the story!',
    });
  } catch (err: any) {
    console.error('Story Continuation Error:', err);
    return res.json({
      continuationText: `You made a fantastic choice! The adventure continued with bright sunshine, cheerful birds, and happy smiles all around.`,
      funTakeaway: 'You have a wonderful imagination!',
    });
  }
});

// ----------------------------------------------------
// 7. SPEAKING JOURNAL (Daily 30-Second Check-In)
// ----------------------------------------------------
app.post('/api/speaking-journal', async (req, res) => {
  try {
    const { transcript = '', promptText = 'How was your day?', tier = 'Basic', durationSeconds = 0 } = req.body;

    if (!ai || !transcript || transcript.trim().length === 0) {
      return res.json({
        journalTitle: 'My Cheerful Daily Check-in',
        moodEmoji: '🌟',
        gentleResponse:
          "Thank you for sharing your day with me! I loved listening to your voice. Every time you speak English, your confidence grows bigger and brighter!",
        encouragementHighlight: `You recorded a wonderful check-in today!`,
        celebrationBadge: 'Daily Voice Hero',
      });
    }

    const tierContext =
      tier === 'Basic'
        ? 'Child is ~6 years old. Use short, joyful, simple words with high enthusiasm.'
        : tier === 'Intermediate'
        ? 'Child is ~10 years old. Be friendly, conversational, and ask one sweet curious follow-up thought.'
        : 'Child is 12+. Provide thoughtful, engaging feedback celebrating their daily reflections.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are Barnaby the Bear, the warm, cheering buddy in "English Buddy" (IELTS English app for kids aged 6-12).
The child just completed their daily 30-second Speaking Journal check-in!
Prompt: "${promptText}"
Time Spoken: ${durationSeconds} seconds
Child's Difficulty Tier: ${tier} (${tierContext})
What the child said:
"${transcript}"

Your goal:
1. Provide a gentle, heartwarming, personalized response back (2-3 sentences) responding directly to what happened in their day with genuine joy and praise for practicing their spoken English.
2. Generate a cheerful, short title for their diary entry (max 5 words).
3. Pick a fitting mood emoji.
4. Give a one-sentence encouraging highlight about their speaking habit.
5. Award a fun kid badge title (e.g., "Star Explorer", "Sunny Friend", "Kind Heart", "Creative Builder").

Return ONLY valid JSON matching this schema:
{
  "journalTitle": string,
  "moodEmoji": string,
  "gentleResponse": string,
  "encouragementHighlight": string,
  "celebrationBadge": string
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      journalTitle: result.journalTitle || "Today's Great Adventure",
      moodEmoji: result.moodEmoji || '🌈',
      gentleResponse:
        result.gentleResponse ||
        "I loved hearing about your day! You spoke so clearly and bravely. Keep shining, buddy!",
      encouragementHighlight:
        result.encouragementHighlight || `You spoke for ${durationSeconds} seconds with great enthusiasm!`,
      celebrationBadge: result.celebrationBadge || 'Daily Storyteller',
    });
  } catch (err: any) {
    console.error('Speaking Journal Error:', err);
    return res.json({
      journalTitle: 'My Wonderful Day',
      moodEmoji: '✨',
      gentleResponse:
        "Thank you for telling me about your day! You did an amazing job speaking up, and I can't wait to chat again tomorrow!",
      encouragementHighlight: 'Great job completing your daily check-in!',
      celebrationBadge: 'Speaking Star',
    });
  }
});

// Vite middleware & Express Server setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`English Buddy full-stack app running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
