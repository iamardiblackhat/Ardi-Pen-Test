export function intelligenceReturn(search: string): string | null {
  const parameters = new URLSearchParams(search);
  if (parameters.get("next") !== "intelligence") return null;
  return `/intelligence?search=${encodeURIComponent(parameters.get("search") ?? "")}`;
}

export function authContinuation(search: string): string {
  if (!intelligenceReturn(search)) return "";
  const parameters = new URLSearchParams(search);
  return `?next=intelligence&search=${encodeURIComponent(parameters.get("search") ?? "")}`;
}
