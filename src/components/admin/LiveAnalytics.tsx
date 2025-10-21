import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsData {
  teamCompletionByRoom: { room_name: string; completion: number }[];
  avgScoresByTrack: { track_name: string; avg_score: number }[];
  judgeActivity: { judge_name: string; score_count: number }[];
  timePerTeam: { team_name: string; avg_time_minutes: number }[];
}

export default function LiveAnalytics() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    teamCompletionByRoom: [],
    avgScoresByTrack: [],
    judgeActivity: [],
    timePerTeam: [],
  });

  const fetchAnalytics = async () => {
    try {
      // Fetch all required data
      const [roomsRes, teamsRes, scoresRes, tracksRes, criteriaRes, judgesRes] = await Promise.all([
        supabase.from("rooms").select("id, name, track_id"),
        supabase.from("teams").select("id, name, room_id, track_id"),
        supabase.from("scores").select("id, team_id, judge_id, judge_name, created_at"),
        supabase.from("tracks").select("id, name"),
        supabase.from("criteria").select("id, track_id"),
        supabase.from("judge_assignments").select("judge_id, room_id"),
      ]);

      const rooms = roomsRes.data || [];
      const teams = teamsRes.data || [];
      const scores = scoresRes.data || [];
      const tracks = tracksRes.data || [];
      const criteria = criteriaRes.data || [];

      // 1. Team completion % per room
      const teamCompletionByRoom = rooms.map((room) => {
        const roomTeams = teams.filter((t) => t.room_id === room.id);
        const roomTrackCriteria = criteria.filter((c) => c.track_id === room.track_id);
        const expectedScoresPerTeam = roomTrackCriteria.length;

        if (roomTeams.length === 0 || expectedScoresPerTeam === 0) {
          return { room_name: room.name, completion: 0 };
        }

        const completedTeams = roomTeams.filter((team) => {
          const teamScores = scores.filter((s) => s.team_id === team.id);
          return teamScores.length >= expectedScoresPerTeam;
        });

        const completion = (completedTeams.length / roomTeams.length) * 100;
        return { room_name: room.name, completion: Math.round(completion) };
      });

      // 2. Average scores per track
      const avgScoresByTrack = tracks.map((track) => {
        const trackTeams = teams.filter((t) => t.track_id === track.id);
        const trackScores = scores.filter((s) =>
          trackTeams.some((team) => team.id === s.team_id)
        );

        const avgScore =
          trackScores.length > 0
            ? trackScores.reduce((sum, s) => sum + 1, 0) / trackScores.length
            : 0;

        return { track_name: track.name, avg_score: Math.round(avgScore * 100) / 100 };
      });

      // 3. Judge scoring activity count
      const judgeActivityMap = new Map<string, number>();
      scores.forEach((score) => {
        const judgeName = score.judge_name || "Unknown Judge";
        judgeActivityMap.set(judgeName, (judgeActivityMap.get(judgeName) || 0) + 1);
      });
      const judgeActivity = Array.from(judgeActivityMap.entries())
        .map(([judge_name, score_count]) => ({ judge_name, score_count }))
        .sort((a, b) => b.score_count - a.score_count);

      // 4. Time-per-team metrics (based on first and last score timestamps)
      const timePerTeam = teams.map((team) => {
        const teamScores = scores
          .filter((s) => s.team_id === team.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (teamScores.length < 2) {
          return { team_name: team.name, avg_time_minutes: 0 };
        }

        const firstScore = new Date(teamScores[0].created_at).getTime();
        const lastScore = new Date(teamScores[teamScores.length - 1].created_at).getTime();
        const avg_time_minutes = Math.round((lastScore - firstScore) / 60000);

        return { team_name: team.name, avg_time_minutes };
      });

      setAnalytics({
        teamCompletionByRoom,
        avgScoresByTrack,
        judgeActivity,
        timePerTeam: timePerTeam.filter((t) => t.avg_time_minutes > 0),
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("scores-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Live Analytics</h2>
        <p className="text-muted-foreground">Real-time scoring metrics and insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Room Completion</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.teamCompletionByRoom.slice(0, 3).map((room) => (
                <div key={room.room_name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{room.room_name}</span>
                  <span className="font-bold">{room.completion}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score by Track</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.avgScoresByTrack.slice(0, 3).map((track) => (
                <div key={track.track_name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{track.track_name}</span>
                  <span className="font-bold">{track.avg_score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Judge Activity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.judgeActivity.slice(0, 3).map((judge) => (
                <div key={judge.judge_name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{judge.judge_name}</span>
                  <span className="font-bold">{judge.score_count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time per Team</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.timePerTeam.slice(0, 3).map((team) => (
                <div key={team.team_name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{team.team_name}</span>
                  <span className="font-bold">{team.avg_time_minutes}m</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
