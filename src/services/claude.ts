import type { Plant, PlantIdentificationResult } from '../types/plant';
import type { ChatMessage } from '../types/chat';
import { PLANT_IDENTIFICATION_PROMPT, buildBotanistSystemPrompt } from '../constants/prompts';

const MODEL = 'claude-sonnet-4-20250514';
const API_URL = 'https://api.anthropic.com/v1/messages';

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!key) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  return key;
}

export async function identifyPlant(imageBase64: string): Promise<PlantIdentificationResult> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: PLANT_IDENTIFICATION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('No text content in Claude response');

  const parsed = JSON.parse(text) as PlantIdentificationResult;
  return parsed;
}

export async function chatWithBotanist(
  messages: ChatMessage[],
  plant?: Plant
): Promise<string> {
  const systemPrompt = buildBotanistSystemPrompt(plant);

  const apiMessages = messages.map((msg) => {
    if (msg.role === 'user' && msg.imageBase64) {
      return {
        role: msg.role,
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: msg.imageBase64,
            },
          },
          { type: 'text', text: msg.content },
        ],
      };
    }
    return { role: msg.role, content: msg.content };
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('No text content in Claude response');

  return text;
}
