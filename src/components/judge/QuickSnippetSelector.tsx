import { Snippet } from "@/hooks/useSnippets";
import { Badge } from "@/components/ui/badge";

interface QuickSnippetSelectorProps {
  snippets: Snippet[];
  onSelect: (text: string) => void;
}

export const QuickSnippetSelector = ({ snippets, onSelect }: QuickSnippetSelectorProps) => {
  if (!snippets.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {snippets.map((snippet) => (
        <Badge 
          key={snippet.id} 
          onClick={() => onSelect(snippet.full_text)} 
          className="cursor-pointer hover:bg-primary/80"
        >
          {snippet.shortcut}
        </Badge>
      ))}
    </div>
  );
};