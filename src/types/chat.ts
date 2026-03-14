export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;
};
