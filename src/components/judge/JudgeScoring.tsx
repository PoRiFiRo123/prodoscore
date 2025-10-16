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
import LiveTeamStats from "./LiveTeamStats";

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
  type: "text" | "dropdown";
  options: { label: string; score: number }[] | null;
}

interface JudgeScoringProps {
  roomId: string;
  judgeName: string;
}

const JudgeScoring = ({ roomId, judgeName }: JudgeScoringProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dropdownSelections, setDropdownSelections] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (!selectedTeam) {
      if (Object.keys(dropdownSelections).length) {
        setDropdownSelections({});
      }
      return;
    }

    if (!criteria.length) return;

    const derivedSelections: Record<string, string> = {};

    criteria.forEach((criterion) => {
      if (criterion.type === "dropdown" && criterion.options) {
        const score = scores[criterion.id];
        const optionIndex = criterion.options.findIndex(
          (option) => option.score === score
        );

        if (optionIndex !== -1) {
          derivedSelections[criterion.id] = optionIndex.toString();
        }
      }
    });

    const currentKeys = Object.keys(dropdownSelections);
    const derivedKeys = Object.keys(derivedSelections);

    const hasChanges =
      currentKeys.length !== derivedKeys.length ||
      derivedKeys.some((key) => dropdownSelections[key] !== derivedSelections[key]);

    if (hasChanges) {
      setDropdownSelections(derivedSelections);
    }
  }, [criteria, dropdownSelections, scores, selectedTeam]);

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("id, name, team_number, members")
      .eq("room_id", roomId)
      .order("team_number");

    setTeams(data || []);
  };

  const fetchCriteria = async () => {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("track_id")
      .eq("id", roomId)
      .single();

    if (!roomData) return;

    const { data } = await supabase
      .from("criteria")
      .select("id, name, max_score, type, options")
      .eq("track_id", roomData.track_id)
      .order("display_order");

    setCriteria((data as any) || []);
  };

  const loadExistingScores = async () => {
    if (!selectedTeam) return;

    const { data } = await supabase
      .from("scores")
      .select("criterion_id, score, comment")
      .eq("team_id", selectedTeam.id)
      .eq("judge_name", judgeName);

    if (data && data.length > 0) {
      const scoresMap: Record<string, number> = {};
      const dropdownMap: Record<string, string> = {};

      data.forEach((s) => {
        scoresMap[s.criterion_id] = Number(s.score);
        if (s.comment) setComment(s.comment);
      });

      criteria.forEach((criterion) => {
        if (criterion.type === "dropdown" && criterion.options) {
          const optionIndex = criterion.options.findIndex(
            (option) => option.score === scoresMap[criterion.id]
          );

          if (optionIndex !== -1) {
            dropdownMap[criterion.id] = optionIndex.toString();
          }
        }
      });

      setScores(scoresMap);
      setDropdownSelections(dropdownMap);
    }
  };

  const handleSaveScores = async () => {
    if (!selectedTeam) return;

    setSaving(true);

    try {
      await supabase
        .from("scores")
        .delete()
        .eq("team_id", selectedTeam.id)
        .eq("judge_name", judgeName);

      const scoreEntries = criteria.map((criterion) => ({
        team_id: selectedTeam.id,
        judge_name: judgeName,
        criterion_id: criterion.id,
        score: scores[criterion.id] || 0,
        comment: comment,
      }));

      const { error } = await supabase.from("scores").insert(scoreEntries);

      if (error) throw error;

      toast({
        title: "Scores saved",
        description: "Team evaluation has been saved successfully.",
      });

      setSelectedTeam(null);
      setScores({});
      setDropdownSelections({});
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
      <div className="space-y-6">
        <LiveTeamStats roomId={roomId} />
        
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Select a Team
          </h2>
          <p className="text-muted-foreground mt-2">Choose a team to begin evaluation</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
              onClick={() => setSelectedTeam(team)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="group-hover:text-primary transition-colors">
                  {team.name}
                </CardTitle>
                <CardDescription className="font-semibold">{team.team_number}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full" />
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="outline" onClick={() => setSelectedTeam(null)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Teams
      </Button>

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="text-2xl">Evaluating: {selectedTeam.name}</CardTitle>
          <CardDescription className="text-base">{selectedTeam.team_number}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {criteria.map((criterion) => {
            const selectedOption =
              criterion.type === "dropdown" && dropdownSelections[criterion.id] !== undefined
                ? criterion.options?.[Number(dropdownSelections[criterion.id])]
                : null;

            return (
              <div key={criterion.id} className="space-y-3 p-4 rounded-lg bg-secondary/30 border">
                <Label htmlFor={criterion.id} className="text-base font-semibold">
                  {criterion.name}
                </Label>

                {criterion.type === "text" ? (
                  <div className="space-y-2">
                    <Input
                      id={criterion.id}
                      type="number"
                      min="0"
                      max={criterion.max_score}
                      step="0.5"
                      value={scores[criterion.id] || 0}
                      onChange={(e) =>
                        setScores({
                          ...scores,
                          [criterion.id]: Number(e.target.value),
                        })
                      }
                      className="text-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum: {criterion.max_score} points
                    </p>
                  </div>
                ) : (
                  <Select
                    value={dropdownSelections[criterion.id] || ""}
                    onValueChange={(value) => {
                      const option = criterion.options?.[Number(value)];

                      setDropdownSelections({
                        ...dropdownSelections,
                        [criterion.id]: value,
                      });

                      if (option) {
                        setScores({
                          ...scores,
                          [criterion.id]: option.score,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="text-lg bg-popover">
                      <SelectValue>
                        {selectedOption
                          ? `${selectedOption.label} (${selectedOption.score} points)`
                          : "Select an option"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-[100]">
                      {criterion.options?.map((option, idx) => (
                        <SelectItem 
                          key={idx} 
                          value={idx.toString()}
                          className="cursor-pointer hover:bg-accent/10"
                        >
                          {option.label} ({option.score} points)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}

          <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border">
            <Label htmlFor="comment" className="text-base font-semibold">
              Comments (Optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your feedback and observations here..."
              rows={5}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSaveScores}
            disabled={saving}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {saving ? "Saving..." : <><Save className="h-5 w-5 mr-2" /> Save Evaluation</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JudgeScoring;