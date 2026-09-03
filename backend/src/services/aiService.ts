/**
 * AI Service — pluggable provider interface
 * Primary: Groq (free API, no credit card)
 * Fallback: Google Gemini 1.5 Flash (free tier)
 *
 * Tradeoff note: Groq's free tier has rate limits (~30 req/min).
 * For production scale, upgrade to a paid tier or implement request queuing.
 */

import https from 'https';
import Groq from 'groq-sdk';
import { logger } from '../utils/logger';

let groqClient: Groq | null = null;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function getGroqClient(): Groq {
  if (!groqClient || (groqClient as any).apiKey !== process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      httpAgent: httpsAgent,
    });
  }
  return groqClient;
}

/**
 * Call Groq first; fall back to Gemini if Groq fails.
 */
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  // Try Groq first
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content ?? '';
  } catch (groqErr) {
    logger.warn('Groq API failed, falling back to Gemini:', groqErr);
  }

  // Fallback to Gemini 1.5 Flash (free tier via REST)
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch (geminiErr) {
    logger.error('Gemini fallback also failed:', geminiErr);
    throw new Error('All AI providers unavailable');
  }
}

// ============================================================
// Notice Summarizer — generates 3-bullet summary
// ============================================================
export async function generateAISummary(title: string, body: string): Promise<string> {
  const system = `You are an assistant that summarizes campus notices into exactly 3 bullet points.
Each bullet should be concise (under 20 words). Format: "• [point]"`;
  const user = `Notice Title: ${title}\n\nNotice Content:\n${body}`;
  return await callAI(system, user);
}

// ============================================================
// Flashcard Generator
// ============================================================
export async function generateFlashcards(
  noteTitle: string,
  noteContent: string
): Promise<Array<{ question: string; answer: string }>> {
  const system = `You are a study assistant. Generate flashcards from the provided notes.
Return a JSON array of objects with "question" and "answer" fields only.
Generate 5-10 flashcards covering the key concepts.`;
  const user = `Note: ${noteTitle}\n\n${noteContent}`;

  const raw = await callAI(system, user);

  // Extract JSON from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.warn('Flashcard AI response did not contain valid JSON array');
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]) as Array<{ question: string; answer: string }>;
  } catch {
    logger.warn('Failed to parse flashcard JSON');
    return [];
  }
}

// ============================================================
// Quiz Generator
// ============================================================
export async function generateQuiz(
  noteTitle: string,
  noteContent: string,
  questionCount: number
): Promise<Array<{
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}>> {
  const system = `You are a quiz generator. Create multiple-choice questions from the provided notes.
Return a JSON array with exactly ${questionCount} objects.
Each object must have: "question" (string), "options" (array of 4 strings),
"correctIndex" (0-3), "explanation" (string).`;
  const user = `Note: ${noteTitle}\n\n${noteContent}`;

  const raw = await callAI(system, user);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

// ============================================================
// Study Buddy Chat
// ============================================================
export async function chatWithStudyBuddy(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  notesContext: string;
}): Promise<string> {
  const groq = getGroqClient();
  const systemPrompt = `You are CampusCore Study Buddy, a helpful AI tutor.
You help students understand their study notes, answer questions, and explain concepts.
${params.notesContext ? `Here are the student's notes you can reference:\n\n${params.notesContext}` : ''}
Be concise, encouraging, and academically accurate.`;

  try {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...params.history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: params.message },
    ];

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages,
      max_tokens: 1024,
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content ?? 'I could not generate a response.';
  } catch (err) {
    logger.warn('Groq chat failed, using Gemini fallback');
    return await callAI(systemPrompt, params.message);
  }
}
