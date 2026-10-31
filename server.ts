import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_DECKS } from './src/data/initialDecks.ts';
import { Deck, Flashcard, ReviewRating } from './src/types/index.ts';
import { calculateNextReview } from './src/utils/srs.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'decks.json');

app.use(express.json({ limit: '25mb' }));

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDecks(): Deck[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading decks file, falling back to initial seed:', err);
  }
  // Initialize with seed data
  saveDecks(INITIAL_DECKS);
  return INITIAL_DECKS;
}

function saveDecks(decks: Deck[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(decks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing decks file:', err);
  }
}

// In-memory cache synced with disk
let inMemoryDecks: Deck[] = loadDecks();

// Initialize Google GenAI client (server-side only)
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: 'gen-lang-client-0498438050',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Resilient Gemini generateContent helper with 503 fallback
async function generateWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      console.warn(`Model ${model} failed with ${err.status || err.message}, trying fallback...`);
      lastError = err;
      // If error is 503 or 429, try next model
      if (err.status === 503 || err.status === 429 || String(err).includes('503')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
    decksCount: inMemoryDecks.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/decks', (req: Request, res: Response) => {
  res.json({ decks: inMemoryDecks });
});

app.post('/api/decks', (req: Request, res: Response) => {
  const { title, description, subject, tags, cards, scanImageUrl } = req.body;
  const newDeck: Deck = {
    id: `deck-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title || 'Untitled Study Deck',
    description: description || 'Generated from OmniLens AI Vision',
    subject: subject || 'General Studies',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ['AI Scan'],
    scanImageUrl: scanImageUrl || undefined,
    cards: Array.isArray(cards)
      ? cards.map((c: any) => ({
          ...c,
          id: c.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          repetitions: c.repetitions ?? 0,
          interval: c.interval ?? 1,
          easeFactor: c.easeFactor ?? 2.5,
          nextReviewDate: c.nextReviewDate || new Date().toISOString(),
          isVerified: c.isVerified ?? true,
        }))
      : [],
  };

  inMemoryDecks = [newDeck, ...inMemoryDecks];
  saveDecks(inMemoryDecks);
  res.status(201).json({ deck: newDeck });
});

app.put('/api/decks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = inMemoryDecks.findIndex((d) => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  inMemoryDecks[index] = {
    ...inMemoryDecks[index],
    ...req.body,
    id, // protect id
    updatedAt: new Date().toISOString(),
  };

  saveDecks(inMemoryDecks);
  res.json({ deck: inMemoryDecks[index] });
});

app.delete('/api/decks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = inMemoryDecks.length;
  inMemoryDecks = inMemoryDecks.filter((d) => d.id !== id);

  if (inMemoryDecks.length === initialLen) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  saveDecks(inMemoryDecks);
  res.json({ success: true, remainingCount: inMemoryDecks.length });
});

app.post('/api/decks/:id/cards', (req: Request, res: Response) => {
  const { id } = req.params;
  const deck = inMemoryDecks.find((d) => d.id === id);
  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const newCards = (Array.isArray(req.body.cards) ? req.body.cards : [req.body.card]).map(
    (c: any) => ({
      ...c,
      id: c.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repetitions: c.repetitions ?? 0,
      interval: c.interval ?? 1,
      easeFactor: c.easeFactor ?? 2.5,
      nextReviewDate: c.nextReviewDate || new Date().toISOString(),
      isVerified: c.isVerified ?? true,
    })
  );

  deck.cards = [...deck.cards, ...newCards];
  deck.updatedAt = new Date().toISOString();
  saveDecks(inMemoryDecks);

  res.status(201).json({ deck });
});

app.post('/api/decks/:deckId/cards/:cardId/review', (req: Request, res: Response) => {
  const { deckId, cardId } = req.params;
  const { rating } = req.body as { rating: ReviewRating };

  const deck = inMemoryDecks.find((d) => d.id === deckId);
  if (!deck) {
    return res.status(404).json({ error: 'Deck not found' });
  }

  const card = deck.cards.find((c) => c.id === cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const updatedSrs = calculateNextReview(
    {
      repetitions: card.repetitions || 0,
      interval: card.interval || 1,
      easeFactor: card.easeFactor || 2.5,
    },
    rating || 'good'
  );

  card.repetitions = updatedSrs.repetitions;
  card.interval = updatedSrs.interval;
  card.easeFactor = updatedSrs.easeFactor;
  card.nextReviewDate = updatedSrs.nextReviewDate;
  card.lastReviewed = new Date().toISOString();

  if (!card.history) card.history = [];
  card.history.push({
    date: new Date().toISOString(),
    rating: rating || 'good',
  });

  deck.updatedAt = new Date().toISOString();
  saveDecks(inMemoryDecks);

  res.json({ success: true, card, deck });
});

// AI Flashcard Generation Endpoint (Camera scan / visual analysis)
app.post('/api/ai/scan', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', studyGoal, focusArea } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const isSvg = mimeType.includes('svg') || imageBase64.includes('image/svg');

    let contentsParts: any[] = [];

    if (isSvg) {
      // Decode SVG and extract clean study text for Gemini
      const rawSvg = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      const textMatches = Array.from(rawSvg.matchAll(/<text[^>]*>(.*?)<\/text>/gi))
        .map((m) => m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
        .filter(Boolean);
      const extractedSvgText = textMatches.join('\n');

      contentsParts = [
        {
          text: `The following is a scanned study note / lecture diagram transcript:\n\n"""\n${extractedSvgText}\n"""\n\nRaw SVG Structure:\n${rawSvg.substring(0, 3000)}`,
        },
      ];
    } else {
      contentsParts = [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
      ];
    }

    const promptText = `Examine this scanned study material, textbook page, diagram, handwritten note, or formula sheet in detail.
Extract a highly structured, accurate study deck consisting of 4 to 8 high-yield flashcards.
Strict accuracy requirements:
1. Every card MUST quote or reference specific visual evidence found in the document in 'sourceEvidence'.
2. If text or formulas are partially illegible, note this in 'clarityNotes' and 'potentialAmbiguities'. Do NOT hallucinate unreadable terms.
3. Provide a 'verifiedFactCheck' note validating each card's principle against academic consensus.
4. Provide a creative or high-yield mnemonic where applicable.
5. Provide an overallAccuracyScore (0-100) reflecting confidence in the extraction fidelity.
${studyGoal ? `Focus particularly on study goal: "${studyGoal}".` : ''}
${focusArea ? `Emphasize domain: "${focusArea}".` : ''}
`;

    contentsParts.push({ text: promptText });

    // System instruction and schema definition
    const systemInstruction =
      'You are OmniLens AI, a world-class academic knowledge synthesizer, vision OCR specialist, and fact-checking educator. Extract precise, rigorous, organized flashcards from study materials with verifiable citations and zero hallucinations.';

    const { response, modelUsed } = await generateWithFallback({
      contents: {
        parts: contentsParts,
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deckTitle: { type: Type.STRING, description: 'Clear academic deck title' },
            subject: { type: Type.STRING, description: 'Subject or field of study' },
            summary: { type: Type.STRING, description: 'Concise summary of scanned content' },
            overallAccuracyScore: {
              type: Type.NUMBER,
              description: 'Confidence score from 0 to 100 on visual extraction fidelity',
            },
            accuracyAssessment: {
              type: Type.OBJECT,
              properties: {
                groundingConfidence: {
                  type: Type.STRING,
                  description: 'High, Medium, or Low',
                },
                clarityNotes: {
                  type: Type.STRING,
                  description: 'Notes on legibility and visual resolution',
                },
                potentialAmbiguities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Ambiguous or potentially smudged items',
                },
                hallucinationRisk: {
                  type: Type.STRING,
                  description: 'Minimal, Moderate, or High',
                },
                verifiedSourceCitations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lines or headings cited from the scanned image',
                },
              },
              required: [
                'groundingConfidence',
                'clarityNotes',
                'potentialAmbiguities',
                'hallucinationRisk',
                'verifiedSourceCitations',
              ],
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  front: { type: Type.STRING, description: 'Clear question, prompt, or term' },
                  back: { type: Type.STRING, description: 'Concise, rigorous answer or definition' },
                  keyFormulaOrTerm: { type: Type.STRING },
                  mnemonic: { type: Type.STRING },
                  category: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: 'Easy, Medium, or Hard' },
                  accuracyRating: { type: Type.NUMBER, description: '0 to 100 confidence' },
                  sourceEvidence: {
                    type: Type.STRING,
                    description: 'Exact visible evidence, diagram label, or text snippet from image',
                  },
                  verifiedFactCheck: {
                    type: Type.STRING,
                    description: 'Academic fact check grounding',
                  },
                },
                required: [
                  'front',
                  'back',
                  'category',
                  'difficulty',
                  'accuracyRating',
                  'sourceEvidence',
                ],
              },
            },
          },
          required: [
            'deckTitle',
            'subject',
            'summary',
            'overallAccuracyScore',
            'accuracyAssessment',
            'flashcards',
          ],
        },
      },
    });

    console.log(`Scan generated successfully using model: ${modelUsed}`);
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('No response text received from Gemini');
    }

    const parsedData = JSON.parse(textOutput);
    res.json({ result: parsedData });
  } catch (err: any) {
    console.error('Gemini vision scan error:', err);
    res.status(500).json({
      error: err.message || 'Failed to scan image with Gemini vision',
    });
  }
});

// Deep Accuracy Fact-Checking for a specific flashcard
app.post('/api/ai/verify-fact', async (req: Request, res: Response) => {
  try {
    const { cardFront, cardBack, subject, sourceEvidence } = req.body;

    const prompt = `Conduct a rigorous academic fact-check on this flashcard:
Subject: ${subject || 'General'}
Front (Prompt): ${cardFront}
Back (Answer): ${cardBack}
Cited Evidence: ${sourceEvidence || 'None provided'}

Provide:
1. Is it completely factually accurate according to academic canon?
2. Accuracy score (0-100)
3. Any nuance, caveat, or common student misconception to be aware of
4. Authoritative textbook / canonical verification note`;

    const { response, modelUsed } = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAccurate: { type: Type.BOOLEAN },
            accuracyScore: { type: Type.NUMBER },
            academicConsensus: { type: Type.STRING },
            commonMisconceptions: { type: Type.STRING },
            canonCitation: { type: Type.STRING },
          },
          required: ['isAccurate', 'accuracyScore', 'academicConsensus', 'canonCitation'],
        },
      },
    });

    console.log(`Fact check generated successfully using model: ${modelUsed}`);
    const parsed = JSON.parse(response.text || '{}');
    res.json({ verification: parsed });
  } catch (err: any) {
    console.error('Fact check error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify fact' });
  }
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OmniLens AI Flashcards server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
