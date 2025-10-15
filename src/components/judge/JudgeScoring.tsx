import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  team_number: string;
  members: string[] | null;
}

interface Criterion {
  id: string;
  name: string;
  max_score: number;
  type: 'text' | 'dropdown';
  options: { label: string; score: number }[] | null;
}

interface JudgeScoringProps {
  roomId: string;
  onBack: () => void;
}

const JudgeScoring = ({ roomId, onBack }: JudgeScoringProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchCriteria();
  }, [roomId]);

  useEffect(() => {
    if (selectedTeam) {
      loadExistingScores();
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("id, name, team_number, members")
      .eq("room_id", roomId)
      .order("team_number");

    setTeams(data || []);
  };

  const fetchCriteria = async () => {
    const { data } = await supabase
      .from("criteria")
      .select("id, name, max_score, type, options")
      .order("display_order");

    setCriteria((data as any) || []);
  };

  const loadExistingScores = async () => {
    if (!selectedTeam) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("scores")
      .select("criterion_id, score, comment")
      .eq("team_id", selectedTeam.id)
      .eq("judge_id", session.user.id);

    if (data) {
      const scoresMap: Record<string, number> = {};
      data.forEach((s) => {
        scoresMap[s.criterion_id] = Number(s.score);
        if (s.comment) setComment(s.comment);
      });
      setScores(scoresMap);
    }
  };

  const handleSaveScores = async () => {
    if (!selectedTeam) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);

    try {
      const scoreEntries = criteria.map((criterion) => ({
        team_id: selectedTeam.id,
        judge_id: session.user.id,
        criterion_id: criterion.id,
        score: scores[criterion.id] || 0,
        comment: comment,
      }));

      for (const entry of scoreEntries) {
        await supabase
          .from("scores")
          .upsert(entry, { onConflict: "team_id,judge_id,criterion_id" });
      }

      toast({
        title: "Scores saved",
        description: "Team evaluation has been saved successfully.",
      });

      setSelectedTeam(null);
      setScores({});
      setComment("");
    } catch (error: any) {
      toast({
        title: "Error saving scores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedTeam) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Button>

        <div>
          <h2 className="text-2xl font-bold">Select a Team</h2>
          <p className="text-muted-foreground">Choose a team to evaluate</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTeam(team)}
            >
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.team_number}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {team.members?.length || 0} members
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={() => setSelectedTeam(null)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Team List
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Evaluating: {selectedTeam.name}</CardTitle>
          <CardDescription>{selectedTeam.team_number}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {criteria.map((criterion) => (
            <div key={criterion.id} className="space-y-2">
              <Label htmlFor={criterion.id}>{criterion.name}</Label>
              
              {criterion.type === "text" ? (
                <div className="space-y-1">
                  <Input
                    id={criterion.id}
                    type="number"
                    min="0"
                    max={criterion.max_score}
                    step="0.5"
                    value={scores[criterion.id] || 0}
                    onChange={(e) =>
                      setScores({ ...scores, [criterion.id]: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Max: {criterion.max_score}</p>
                </div>
              ) : (
                <Select
                  value={scores[criterion.id]?.toString() || ""}
                  onValueChange={(value) =>
                    setScores({ ...scores, [criterion.id]: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {criterion.options?.map((option, idx) => (
                      <SelectItem key={idx} value={option.score.toString()}>
                        {option.label} ({option.score} points)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="comment">Comments (Optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your feedback here..."
              rows={4}
            />
          </div>

          <Button onClick={handleSaveScores} disabled={saving} className="w-full">
            {saving ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Evaluation</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JudgeScoring;
