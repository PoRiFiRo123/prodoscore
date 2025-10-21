import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Users, Building, FileText, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LiveTeamStats from "./LiveTeamStats";
import { useSnippets } from "@/hooks/useSnippets";
import { autoExpandSnippets } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  team_number: string;
  members: string[] | null;
  college: string | null;
  problem_statement: string | null;
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
  judgeId: string | null;
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
}

const JudgeScoring = ({ roomId, judgeName, judgeId, selectedTeam, setSelectedTeam }: JudgeScoringProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dropdownSelections, setDropdownSelections] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const { snippets, loading: snippetsLoading } = useSnippets(trackId);

  useEffect(() => {
    fetchTeams();
    fetchCriteriaAndTrack();
    fetchRoomLockStatus();
  }, [roomId]);

  useEffect(() => {
    if (selectedTeam && judgeId) {
      loadExistingScores();
    }
  }, [selectedTeam, judgeId]);

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

  const fetchRoomLockStatus = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("is_locked")
      .eq("id", roomId)
      .single();

    if (error) {
      console.error("Error fetching room lock status:", error);
      return;
    }
    
    setIsRoomLocked(data?.is_locked || false);
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, team_number, members, college, problem_statement")
      .eq("room_id", roomId)
      .order("team_number");

    if (error) {
      console.error("Error fetching teams:", error);
      setTeams([]);
      return;
    }

    setTeams((data as Team[]) || []);
  };

  const fetchCriteriaAndTrack = async () => {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("track_id")
      .eq("id", roomId)
      .single();

    if (!roomData) return;

    setTrackId(roomData.track_id);

    const { data } = await supabase
      .from("criteria")
      .select("id, name, max_score, type, options")
      .eq("track_id", roomData.track_id)
      .order("display_order");

    setCriteria((data as any) || []);
  };

  const loadExistingScores = async () => {
    if (!selectedTeam || !judgeId) return;

    const { data } = await supabase
      .from("scores")
      .select("criterion_id, score, comment")
      .eq("team_id", selectedTeam.id)
      .eq("judge_id", judgeId);

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
    } else {
        setScores({});
        setDropdownSelections({});
        setComment("");
    }
  };

  const handleSaveScores = async () => {
    if (!selectedTeam || !judgeId) return;

    setSaving(true);

    try {
      await supabase
        .from("scores")
        .delete()
        .eq("team_id", selectedTeam.id)
        .eq("judge_id", judgeId);

      const scoreEntries = criteria.map((criterion) => ({
        team_id: selectedTeam.id,
        judge_id: judgeId,
        criterion_id: criterion.id,
        score: scores[criterion.id] || 0,
        comment: comment,
        judge_name: judgeName,
      }));

      const { error } = await supabase.from("scores").insert(scoreEntries);

      if (error) throw error;

      toast({
        title: "Scores saved",
        description: "Team evaluation has been saved successfully.",
      });

      setSelectedTeam(null);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {!selectedTeam ? (
        <>
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
                className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 flex flex-col"
                onClick={() => setSelectedTeam(team)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {team.name}
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Team ID: {team.team_number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                   <div className="space-y-3">
                      {team.problem_statement && (
                          <div className="pb-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-1"><FileText className="h-3 w-3" /> Problem Statement</p>
                              <p className="text-sm text-foreground line-clamp-2">
                                  {team.problem_statement}
                              </p>
                          </div>
                      )}
                      {team.members && team.members.length > 0 && (
                        <div className="pb-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-1"><Users className="h-3 w-3" /> Members</p>
                          <p className="text-sm text-foreground line-clamp-2">
                            {team.members.join(", ")}
                          </p>
                        </div>
                      )}
                   </div>
                   <div className="space-y-1 text-sm text-muted-foreground pt-2 border-t mt-auto">
                      {team.college &&
                          <p className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{team.college}</span>
                          </p>
                      }
                      <p className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{team.members?.length || 0} members</span>
                      </p>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={() => setSelectedTeam(null)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>

          {isRoomLocked && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <span className="block sm:inline font-semibold">This room is locked. You cannot edit scores.</span>
            </div>
          )}

          <Card className="border-2 shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardTitle className="text-2xl">Evaluating: {selectedTeam.name}</CardTitle>
              <CardDescription className="text-base">
                Team ID: {selectedTeam.team_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><FileText className="h-5 w-5"/> Problem Statement</h3>
                    <p className="text-muted-foreground bg-secondary/30 p-3 rounded-md border">{selectedTeam.problem_statement || "Not provided."}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Users className="h-5 w-5"/> Team Members</h3>
                    <p className="text-muted-foreground bg-secondary/30 p-3 rounded-md border">{selectedTeam.members?.join(", ") || "No members listed."}</p>
                </div>
                {selectedTeam.college &&
                    <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Building className="h-5 w-5"/> College</h3>
                        <p className="text-muted-foreground bg-secondary/30 p-3 rounded-md border">{selectedTeam.college}</p>
                    </div>
                }
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl">Evaluation Criteria</CardTitle>
                <CardDescription>Score the team on the following criteria.</CardDescription>
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
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(criterion.max_score, Number(e.target.value)))
                            setScores({
                              ...scores,
                              [criterion.id]: value,
                            })
                           }
                          }
                          className="text-lg"
                          disabled={isRoomLocked}
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
                        disabled={isRoomLocked}
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
                <div className="flex flex-wrap gap-2 py-2">
                  {snippetsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading snippets...</p>
                  ) : snippets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No snippets available for this track.</p>
                  ) : (
                    snippets.map((snippet) => (
                      <Button 
                          key={snippet.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setComment(prev => `${prev}${prev ? ' ' : ''}${snippet.full_text}`)}
                      >
                          {snippet.shortcut}
                      </Button>
                    ))
                  )}
                </div>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => {
                    const value = autoExpandSnippets(e.target.value, snippets);
                    setComment(value);
                  }}
                  placeholder="Type your feedback, or use a snippet shortcut and press space..."
                  rows={5}
                  className="resize-none"
                  disabled={isRoomLocked}
                />
              </div>

              <Button
                onClick={handleSaveScores}
                disabled={saving || isRoomLocked}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {saving ? "Saving..." : <><Save className="h-5 w-5 mr-2" /> Save Evaluation</>}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default JudgeScoring;
