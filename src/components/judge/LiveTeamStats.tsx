import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Team {
  id: string;
  name: string;
  team_number: string;
  total_score: number;
  scored_count: number;
  total_judges: number;
}

interface LiveTeamStatsProps {
  roomId: string;
}

const LiveTeamStats = ({ roomId }: LiveTeamStatsProps) => {
  const [teams, setTeams] = useState<Team[]>([]);

  const fetchTeamStats = useCallback(async () => {
    // Fetch teams in the room
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, team_number")
      .eq("room_id", roomId)
      .order("team_number");

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      setTeams([]);
      return;
    }
    if (!teamsData) return;

    // Fetch judge count for the room
    const { count: totalJudges, error: judgesError } = await supabase
      .from("judge_assignments")
      .select("judge_id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (judgesError) {
      console.error("Error fetching judge assignments:", judgesError);
      // Continue with totalJudges as 0 if there's an error
    }

    // Fetch score counts and calculate average score for each team
    const teamsWithStats = await Promise.all(
      teamsData.map(async (team) => {
        const { data: scoresData, error: scoresError } = await supabase
          .from("scores")
          .select("judge_id, score")
          .eq("team_id", team.id);

        if (scoresError) {
          console.error("Error fetching scores for team", team.id, ":", scoresError);
          return { 
            ...team,
            total_score: 0,
            scored_count: 0,
            total_judges: totalJudges || 0,
          };
        }

        const scoresByJudge = new Map<string, number>();
        if (scoresData) {
          for (const s of scoresData) {
            if (s.judge_id && typeof s.score === 'number') {
              scoresByJudge.set(
                s.judge_id,
                (scoresByJudge.get(s.judge_id) || 0) + s.score
              );
            }
          }
        }

        const totalScoreFromAllJudges = Array.from(
          scoresByJudge.values()
        ).reduce((sum, score) => sum + score, 0);
        const scoredByJudgesCount = scoresByJudge.size;

        const averageScore =
          scoredByJudgesCount > 0
            ? totalScoreFromAllJudges / scoredByJudgesCount
            : 0;

        return {
          ...team,
          total_score: averageScore,
          scored_count: scoredByJudgesCount,
          total_judges: totalJudges || 0,
        };
      })
    );

    setTeams(teamsWithStats);
  }, [roomId]);

  useEffect(() => {
    fetchTeamStats();

    const channel = supabase
      .channel(`team-stats-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        (payload) => {
          fetchTeamStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchTeamStats]);

  return (
    <Card className="mb-6 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Live Team Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const progress =
              team.total_judges > 0
                ? (team.scored_count / team.total_judges) * 100
                : 0;
            const isComplete =
              team.scored_count === team.total_judges && team.total_judges > 0;

            return (
              <div
                key={team.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {team.team_number}
                      </Badge>
                      {isComplete && (
                        <Badge className="gap-1 bg-success text-success-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold mt-1">{team.name}</h4>
                  </div>
                  <Trophy className="h-5 w-5 text-accent opacity-50" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {team.scored_count}/{team.total_judges} judges
                    </span>
                  </div>

                  <Progress
                    value={progress}
                    className={`h-2 ${isComplete ? "[&>div]:bg-success" : ""}`}
                  />

                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="text-muted-foreground">Avg. Score</span>
                    <span className="font-bold text-primary text-lg">
                          {team.total_score?.toFixed(2) || "0.00"}
                        </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveTeamStats;