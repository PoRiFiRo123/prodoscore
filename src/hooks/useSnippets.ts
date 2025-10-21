import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Snippet {
  id: string;
  track_id: string;
  shortcut: string;
  full_text: string;
  created_at: string | null;
  updated_at: string | null;
}

export const useSnippets = (trackId: string | null) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSnippets = useCallback(async () => {
    if (!trackId) {
      setSnippets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quick_snippets")
        .select("*")
        .eq("track_id", trackId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching snippets:", error);
        toast({
          title: "Error fetching snippets",
          description: error.message,
          variant: "destructive",
        });
      }

      setSnippets(data || []);
    } finally {
      setLoading(false);
    }
  }, [trackId, toast]);

  const insertSnippet = async (shortcut: string, full_text: string) => {
    if (!trackId) {
        toast({
            title: "Error inserting snippet",
            description: "No track selected.",
            variant: "destructive",
        });
        return null;
    }
    try {
      const { data, error } = await supabase
        .from("quick_snippets")
        .insert([{ track_id: trackId, shortcut, full_text }])
        .select();

      if (error) {
        console.error("Error inserting snippet:", error);
        toast({
          title: "Error inserting snippet",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      await fetchSnippets();
      toast({
        title: "Snippet created successfully!",
      });
      return data;
    } catch (error: any) {
      console.error("Error inserting snippet:", error);
      toast({
        title: "Error inserting snippet",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateSnippet = async (id: string, full_text: string) => {
    try {
      const { data, error } = await supabase
        .from("quick_snippets")
        .update({ full_text, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error updating snippet:", error);
        toast({
          title: "Error updating snippet",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }
      await fetchSnippets();
      toast({
        title: "Snippet updated successfully!",
      });
      return data;
    } catch (error: any) {
      console.error("Error updating snippet:", error);
      toast({
        title: "Error updating snippet",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteSnippet = async (id: string) => {
    try {
      const { error } = await supabase.from("quick_snippets").delete().eq("id", id);

      if (error) {
        console.error("Error deleting snippet:", error);
        toast({
          title: "Error deleting snippet",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      await fetchSnippets();
      toast({
        title: "Snippet deleted successfully!",
      });
      return true;
    } catch (error: any) {
      console.error("Error deleting snippet:", error);
      toast({
        title: "Error deleting snippet",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  return {
    snippets,
    loading,
    fetchSnippets,
    insertSnippet,
    updateSnippet,
    deleteSnippet,
  };
};
