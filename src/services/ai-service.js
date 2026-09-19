import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

let client;

function getClient() {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, 'Gemini AI is not configured on the server');
  }

  client ||= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

function getResponseText(response) {
  const content = response.text
    || response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');

  if (!content) throw new AppError(502, 'Gemini returned an empty response');
  return content.trim();
}

function parseJson(content) {
  const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    return JSON.parse(clean);
  } catch {
    throw new AppError(502, 'Gemini returned an invalid structured response');
  }
}

export async function generateJson(instruction, input) {
  const response = await getClient().models.generateContent({
    model: env.GEMINI_MODEL,
    contents: `${instruction}\n\nUSER INPUT:\n${input}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });

  return parseJson(getResponseText(response));
}

export async function generateText(instruction, input) {
  const response = await getClient().models.generateContent({
    model: env.GEMINI_MODEL,
    contents: `${instruction}\n\nUSER INPUT:\n${input}`,
    config: {
      temperature: 0.5,
    },
  });

  return getResponseText(response);
}
