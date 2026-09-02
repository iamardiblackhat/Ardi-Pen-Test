export type ArdiStatus = {
  configured: boolean;
  displayName: string;
  suggestions: string[];
};

export type ArdiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
};

