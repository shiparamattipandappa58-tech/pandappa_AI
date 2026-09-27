import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for document/image attachments
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Server-side Gemini client initialization
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    assistant: 'PANDAPPA AI',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// SSE Streaming chat endpoint
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  if (!aiClient) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please check the AI Studio secrets configuration.',
    });
  }

  const {
    messages = [],
    systemInstruction = '',
    attachments = [],
    temperature = 0.7,
    mode = 'general',
  } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    // Construct contents for Gemini API
    // Gemini takes an array of Content objects: { role: 'user' | 'model', parts: Part[] }
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    // Map conversation history
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // If the message has attachments and it's user
      if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.data && att.mimeType) {
            // Clean base64 string if it contains data prefix
            const cleanBase64 = att.data.includes(';base64,')
              ? att.data.split(';base64,')[1]
              : att.data;
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: cleanBase64,
              },
            });
          }
        }
      }

      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      } else if (parts.length === 0) {
        parts.push({ text: '' });
      }

      contents.push({ role, parts });
    }

    // Attach any new incoming attachments to the last turn if provided separately
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const lastTurn = contents[contents.length - 1];
      if (lastTurn && lastTurn.role === 'user') {
        for (const att of attachments) {
          if (att.data && att.mimeType) {
            const cleanBase64 = att.data.includes(';base64,')
              ? att.data.split(';base64,')[1]
              : att.data;
            lastTurn.parts.unshift({
              inlineData: {
                mimeType: att.mimeType,
                data: cleanBase64,
              },
            });
          }
        }
      }
    }

    // Enhanced System Instruction tailored for PANDAPPA AI
    const defaultInstruction = `You are PANDAPPA AI, an intelligent, fast, respectful, clear, and highly capable personal AI assistant.
Your brand identity: PANDAPPA AI.
Your personality: Helpful, clear, practical, intelligent, and honest about limitations. Friendly yet professional.
Key capabilities: Natural conversation, academic/study assistance (quizzes, flashcards, explanations), programming and code generation/debugging, multimodal document and image analysis, summaries, and multilingual fluency (including English, Kannada ಕನ್ನಡ, and Hindi हिन्दी).
Guidelines:
1. Always be honest about factual boundaries; admit uncertainty rather than inventing answers.
2. Provide concise, direct answers by default, but give detailed, thorough explanations when asked.
3. If speaking or writing in Kannada, use authentic, natural, respectful Kannada (ಕನ್ನಡ).
4. For programming inquiries, provide modern, secure, and clean code with clear step-by-step explanations.
5. Format responses neatly with markdown headings, bullet points, and code blocks with language identifiers.`;

    const finalSystemInstruction = systemInstruction
      ? `${defaultInstruction}\n\nSpecific Mode Instructions:\n${systemInstruction}`
      : defaultInstruction;

    const streamResponse = await aiClient.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: contents as any,
      config: {
        systemInstruction: finalSystemInstruction,
        temperature: Math.min(Math.max(temperature, 0), 1.2),
      },
    });

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Error generating chat stream:', err);
    const friendlyError =
      err?.status === 429
        ? 'PANDAPPA AI service rate limit reached. Please wait a moment and try again.'
        : err?.message || 'An error occurred while generating a response from PANDAPPA AI.';
    res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Specialized Study Mode Endpoint for structured MCQs and Flashcards
app.post('/api/study/generate', async (req: Request, res: Response) => {
  if (!aiClient) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { topic, difficulty = 'Medium', type = 'quiz', language = 'English', count = 5 } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  try {
    if (type === 'quiz') {
      const prompt = `Create a ${count}-question multiple choice quiz on the topic "${topic}".
Difficulty level: ${difficulty}.
Target Language: ${language} (if Kannada, write questions and options in Kannada script).
For each question, provide 4 options, the zero-based index of the correct option, and a clear explanation.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are PANDAPPA AI Study Assistant. Output only valid JSON strictly matching the requested schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctIndex', 'explanation'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.json({ items: parsed });
    } else if (type === 'flashcards') {
      const prompt = `Generate ${count} high-yield study flashcards on "${topic}".
Difficulty level: ${difficulty}.
Target Language: ${language}.
Provide a front (concept, question, or term) and back (concise definition, formula, or key takeaway).`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are PANDAPPA AI Study Assistant. Output only valid JSON strictly matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                hint: { type: Type.STRING },
              },
              required: ['front', 'back'],
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.json({ items: parsed });
    } else {
      // Study notes / revision summary
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create structured study notes and revision summary for "${topic}". Difficulty: ${difficulty}. Language: ${language}.`,
        config: {
          systemInstruction:
            'You are PANDAPPA AI Study Assistant. Create high-yield, structured, clear markdown revision notes with key definitions, concepts, and bullet points.',
        },
      });

      return res.json({ notes: response.text });
    }
  } catch (err: any) {
    console.error('Study generate error:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate study materials.' });
  }
});

// Audio transcription endpoint for voice recording fallback
app.post('/api/transcribe', async (req: Request, res: Response) => {
  if (!aiClient) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { audioData, mimeType = 'audio/webm', languagePrompt = '' } = req.body;
  if (!audioData) {
    return res.status(400).json({ error: 'audioData base64 is required.' });
  }

  try {
    const cleanBase64 = audioData.includes(';base64,')
      ? audioData.split(';base64,')[1]
      : audioData;

    const audioPart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const promptText = languagePrompt
      ? `Transcribe this spoken audio accurately. The speaker may be speaking in ${languagePrompt} or English. Return only the verbatim transcription without extra remarks.`
      : 'Transcribe this spoken audio accurately into text. Return only the verbatim transcription text.';

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: { parts: [audioPart, { text: promptText }] },
    });

    res.json({ text: response.text?.trim() || '' });
  } catch (err: any) {
    console.error('Transcribe error:', err);
    res.status(500).json({ error: err?.message || 'Audio transcription failed.' });
  }
});

// AI TTS endpoint for high-fidelity speech generation
app.post('/api/voice/tts', async (req: Request, res: Response) => {
  if (!aiClient) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { text, voice = 'Kore' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
  }

  try {
    // Truncate text if excessively long for TTS
    const cleanText = text.slice(0, 1000);

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Clear, intelligent, friendly personal assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Could not generate speech audio.' });
    }

    res.json({ audioData: base64Audio, mimeType: 'audio/wav' });
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err?.message || 'TTS generation failed.' });
  }
});

// Mount Vite or serve static production build
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PANDAPPA AI] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
