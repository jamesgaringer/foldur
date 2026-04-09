export function generateId(): string {
  return crypto.randomUUID();
}

export async function hashContentAsync(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function unixToISO(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}
