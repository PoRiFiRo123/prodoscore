import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, CheckCircle2 } from "lucide-react";

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

  useEffect(() => {
    fetchTeamStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("team-scores-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
        },
        () => {
          fetchTeamStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const fetchTeamStats = async () => {
    // Fetch teams in the room
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, team_number, total_score")
      .eq("room_id", roomId)
      .order("team_number");

    if (!teamsData) return;

    // Fetch judge count for the room
    const { data: judgesData } = await supabase
      .from("judge_assignments")
      .select("judge_id")
      .eq("room_id", roomId);

    const totalJudges = judgesData?.length || 0;

    // Fetch score counts for each team
    const teamsWithStats = await Promise.all(
      teamsData.map(async (team) => {
        const { data: scoresData } = await supabase
          .from("scores")
          .select("judge_name")
          .eq("team_id", team.id);

        // Count unique judges who have scored
        const uniqueJudges = new Set(
          scoresData?.map((s) => s.judge_name).filter(Boolean)
        );

        return {
          ...team,
          scored_count: uniqueJudges.size,
          total_judges: totalJudges,
        };
      })
    );

    setTeams(teamsWithStats);
  };

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
            const isComplete = team.scored_count === team.total_judges && team.total_judges > 0;

            return (
              <div
                key={team.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {team.team_number}
                      </Badge>
                      {isComplete && (
                        <CheckCircle2 className="h-4 w-4 text-success" />
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
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isComplete ? "bg-success" : "bg-primary"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="text-muted-foreground">Current Score</span>
                    <span className="font-bold text-primary">
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
