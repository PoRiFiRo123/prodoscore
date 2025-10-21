import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Snippet {
  id: string;
  judge_id: string;
  shortcut: string;
  full_text: string;
  created_at: string | null;
  updated_at: string | null;
}

export function useSnippetExpansion() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  useEffect(() => {
    const fetchSnippets = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("quick_snippets")
        .select("*")
        .eq("judge_id", session.user.id);

      if (data) {
        setSnippets(data);
      }
    };

    fetchSnippets();
  }, []);

  const expandSnippet = useCallback(
    (text: string): string => {
      let expanded = text;

      snippets.forEach((snippet) => {
        const regex = new RegExp(snippet.shortcut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        expanded = expanded.replace(regex, snippet.full_text);
      });

      return expanded;
    },
    [snippets]
  );

  const handleTextChange = useCallback(
    (text: string, onChange: (value: string) => void) => {
      const words = text.split(/\s+/);
      const lastWord = words[words.length - 1];

      const matchingSnippet = snippets.find((s) => s.shortcut === lastWord);

      if (matchingSnippet && text.endsWith(" ")) {
        const newText = text.substring(0, text.length - lastWord.length - 1) + matchingSnippet.full_text + " ";
        onChange(newText);
      } else {
        onChange(text);
      }
    },
    [snippets]
  );

  return { snippets, expandSnippet, handleTextChange };
}
