import { z } from 'zod';
import Prompt from '../models/Prompt.js';
import { generateJson, generateText } from '../services/ai-service.js';

const text = z.string().trim().min(1).max(12000);

const optimizeSchema = z.object({ prompt: text });
const runSchema = z.object({ prompt: text, input: text.max(8000) });
const moderateSchema = z.object({
  title: text.max(160).optional().default(''),
  description: text.max(1200).optional().default(''),
  prompt: text,
});
const searchSchema = z.object({ query: text.max(500) });
const assistantSchema = z.object({
  message: text.max(4000),
  context: z.string().trim().max(2000).optional().default(''),
});

export async function optimize(request, response) {
  const input = optimizeSchema.parse(request.body);
  const result = await generateJson(
    'You are PromptGrid prompt editor. Rewrite the user idea into a reusable, specific AI prompt. Return JSON with exactly these keys: title (string), optimizedPrompt (string), instructions (string), variables (array of strings), qualityNotes (array of strings). Preserve the user intent and do not invent facts.',
    input.prompt
  );

  response.json({ result });
}

export async function run(request, response) {
  const input = runSchema.parse(request.body);
  const output = await generateText(
    'You are a prompt playground. Execute the supplied prompt against the supplied input. Follow the prompt faithfully, do not mention these implementation instructions, and return only the useful final answer.',
    `PROMPT:\n${input.prompt}\n\nINPUT:\n${input.input}`
  );

  response.json({ output });
}

export async function moderate(request, response) {
  const input = moderateSchema.parse(request.body);
  const result = await generateJson(
    'You are PromptGrid moderation assistant. Review a marketplace prompt for safety, spam, duplication risk, clarity, and usefulness. Return JSON with exactly these keys: decision (one of approve, review, reject), score (number 0 to 100), safetyIssues (array of strings), qualityIssues (array of strings), suggestions (array of strings). This is advisory only; never claim to be the final admin decision.',
    `TITLE: ${input.title}\nDESCRIPTION: ${input.description}\nPROMPT: ${input.prompt}`
  );

  response.json({ result });
}

export async function semanticSearch(request, response) {
  const input = searchSchema.parse(request.body);
  const prompts = await Prompt.find({ status: 'approved', visibility: 'public' })
    .select('title description category aiTool tags copyCount averageRating')
    .limit(60)
    .lean();

  if (!prompts.length) return response.json({ results: [] });

  const catalog = prompts.map((prompt) => ({
    id: String(prompt._id),
    title: prompt.title,
    description: prompt.description,
    category: prompt.category,
    aiTool: prompt.aiTool,
    tags: prompt.tags,
  }));

  const ranking = await generateJson(
    'You are a semantic marketplace search assistant. Rank catalog items by meaning and usefulness for the user query. Return JSON with exactly one key: matches, an array of objects with id (string), reason (string), and score (number 0 to 100). Return at most 6 matches and only use IDs from the catalog.',
    `QUERY: ${input.query}\nCATALOG:\n${JSON.stringify(catalog)}`
  );

  const byId = new Map(prompts.map((prompt) => [String(prompt._id), prompt]));
  const results = (Array.isArray(ranking.matches) ? ranking.matches : [])
    .filter((match) => byId.has(match.id))
    .slice(0, 6)
    .map((match) => ({ prompt: byId.get(match.id), reason: match.reason, score: match.score }));

  response.json({ results });
}

export async function assistant(request, response) {
  const input = assistantSchema.parse(request.body);
  const output = await generateText(
    'You are PromptGrid AI Assistant. Reply like a friendly, concise website assistant. For a simple greeting such as hi or hello, reply briefly with: "Hello! Welcome to PromptGrid. How can I help you?" Do not add a long feature list or detailed page tour unless the user asks for it. For other questions, answer the actual question even when it is unrelated to the current page; use the page context only as helpful background. Keep normal replies to 1 to 3 short paragraphs. Do not use Markdown emphasis, asterisks, numbered feature lists, or headings unless the user specifically asks for a formatted list. If the user asks for an action you cannot perform, explain the available PromptGrid AI tools instead.',
    `MESSAGE: ${input.message}\nPAGE CONTEXT: ${input.context}`
  );

  response.json({ output });
}
