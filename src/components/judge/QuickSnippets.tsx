import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Snippet {
  id: string;
  judge_id: string;
  shortcut: string;
  full_text: string;
  created_at: string | null;
  updated_at: string | null;
}

export default function QuickSnippets() {
  const { toast } = useToast();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState("");
  const [newFullText, setNewFullText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        await fetchSnippets(session.user.id);
      }
    };
    init();
  }, []);

  const fetchSnippets = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quick_snippets")
        .select("*")
        .eq("judge_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSnippets(data || []);
    } catch (error: any) {
      console.error("Error fetching snippets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch snippets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSnippet = async () => {
    if (!newShortcut || !newFullText) {
      toast({
        title: "Error",
        description: "Please fill in both shortcut and text",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("quick_snippets").insert({
        judge_id: currentUserId,
        shortcut: newShortcut.startsWith(";") ? newShortcut : `;${newShortcut}`,
        full_text: newFullText,
      });

      if (error) throw error;

      setNewShortcut("");
      setNewFullText("");
      await fetchSnippets(currentUserId);

      toast({
        title: "Success",
        description: "Snippet added successfully",
      });
    } catch (error: any) {
      console.error("Error adding snippet:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSnippet = async (id: string) => {
    try {
      const { error } = await supabase.from("quick_snippets").delete().eq("id", id);

      if (error) throw error;

      await fetchSnippets(currentUserId);

      toast({
        title: "Success",
        description: "Snippet deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting snippet:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Comment Snippets</CardTitle>
        <CardDescription>
          Create shortcuts like <code className="text-xs bg-muted px-1 py-0.5 rounded">;clarity</code> that expand to full text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Shortcut</label>
            <Input
              placeholder=";clarity"
              value={newShortcut}
              onChange={(e) => setNewShortcut(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Text</label>
            <Textarea
              placeholder="Excellent clarity and structure"
              value={newFullText}
              onChange={(e) => setNewFullText(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <Button onClick={handleAddSnippet} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Snippet
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading snippets...</p>
        ) : snippets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No snippets yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shortcut</TableHead>
                <TableHead>Full Text</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snippets.map((snippet) => (
                <TableRow key={snippet.id}>
                  <TableCell className="font-mono text-sm">{snippet.shortcut}</TableCell>
                  <TableCell className="text-sm">{snippet.full_text}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSnippet(snippet.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
