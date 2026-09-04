export type ArdiStatus = {
  configured: boolean;
  displayName: string;
  suggestions: string[];
};

export type ArdiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: string[];
};

export type ArdiConfirmation = {
  name: string;
  label: string;
  input: unknown;
};

export type ArdiCompletedAction = {
  message: string;
  href: string;
  linkLabel: string;
};
