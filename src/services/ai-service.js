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

async function generateContent(contents, config) {
  try {
    return await getClient().models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config,
    });
  } catch (error) {
    const status = error?.status || error?.response?.status;

    if (status === 429 || status === 503) {
      throw new AppError(503, 'Gemini is temporarily busy. Please try again in a moment.');
    }

    if (status === 404) {
      throw new AppError(502, 'The configured Gemini model is unavailable.');
    }

    throw new AppError(502, 'Gemini could not process this request right now.');
  }
}

export async function generateJson(instruction, input) {
  const response = await generateContent(
    `${instruction}\n\nUSER INPUT:\n${input}`,
    {
      responseMimeType: 'application/json',
      temperature: 0.3,
    }
  );

  return parseJson(getResponseText(response));
}

export async function generateText(instruction, input) {
  const response = await generateContent(
    `${instruction}\n\nUSER INPUT:\n${input}`,
    {
      temperature: 0.5,
    }
  );

  return getResponseText(response);
}
