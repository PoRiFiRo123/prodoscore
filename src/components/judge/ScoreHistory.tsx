import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScoreEntry {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  criterion_id: string;
  criteria?: {
    name: string;
  };
}

export default function ScoreHistory({ teamId, judgeId }: { teamId: string; judgeId: string }) {
  const { toast } = useToast();
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("scores")
          .select("*, criteria(name)")
          .eq("team_id", teamId)
          .eq("judge_id", judgeId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setHistory(data || []);
      } catch (error: any) {
        console.error("Error fetching score history:", error);
        toast({
          title: "Error",
          description: "Failed to fetch score history",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (teamId && judgeId) {
      fetchHistory();
    }
  }, [teamId, judgeId]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Score History
          </CardTitle>
          <CardDescription>No scores recorded yet for this team</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Score History
        </CardTitle>
        <CardDescription>{history.length} score(s) recorded</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
            >
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold">{entry.score}</span>
                </div>
                {index < history.length - 1 && (
                  <div className="w-0.5 h-full bg-border mt-2" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{entry.criteria?.name || "Unknown Criterion"}</p>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(entry.created_at)}
                  </Badge>
                </div>

                {entry.comment && (
                  <p className="text-sm text-muted-foreground">{entry.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
