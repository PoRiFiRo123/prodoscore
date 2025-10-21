import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Snippet } from "@/hooks/useSnippets";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const autoExpandSnippets = (text: string, snippets: Snippet[]): string => {
  if (!snippets.length) return text;

  const lastWord = text.split(/\s+/).pop();
  if (!lastWord) return text;

  const matchedSnippet = snippets.find(snippet => snippet.shortcut === lastWord.trim());

  if (matchedSnippet) {
    const newText = text.replace(new RegExp(`${lastWord.trim()}$`), matchedSnippet.full_text);
    return newText;
  }

  return text;
};