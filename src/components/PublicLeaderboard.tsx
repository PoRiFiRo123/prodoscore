import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, TrendingUp, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Team {
  id: string;
  name: string;
  team_number: string;
  track_id: string;
  room_id: string;
  track_name?: string;
  room_name?: string;
  total_score: number;
  rank: number;
}

interface RoomActivity {
  room_id: string;
  room_name: string;
  track_name: string;
  team_count: number;
  avg_score: number;
  top_team?: string;
  teams: { id: string; name: string }[]; // Added teams array to RoomActivity
}

interface Room {
  id: string;
  name: string;
}

interface Track {
  id: string;
  name: string;
}

const PublicLeaderboard = () => {
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [roomActivities, setRoomActivities] = useState<RoomActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch all rooms and tracks
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name");
      if (roomsError) throw roomsError;
      setAllRooms(roomsData || []);

      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("id, name");
      if (tracksError) throw tracksError;
      setAllTracks(tracksData || []);

      // Fetch top teams with track and room info
      let teamsQuery = supabase
        .from("teams")
        .select(
          `
          id,
          name,
          team_number,
          track_id,
          room_id,
          tracks!inner(name),
          rooms!inner(name)
        `
        )
        .order("total_score", { ascending: false });

      if (selectedRoomId) {
        teamsQuery = teamsQuery.eq("room_id", selectedRoomId);
      }
      if (selectedTrackId) {
        teamsQuery = teamsQuery.eq("track_id", selectedTrackId);
      }

      const { data: teamsData, error: teamsError } = await teamsQuery.limit(10);

      if (teamsError) throw teamsError;

      // Calculate scores for each team
      const teamsWithScores = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: scores } = await supabase
            .from("scores")
            .select("score, criterion_id, criteria!inner(weightage)")
            .eq("team_id", team.id);

          const totalScore =
            scores?.reduce((sum, score) => {
              const weightage = (score as any).criteria?.weightage || 1;
              return sum + Number(score.score) * Number(weightage);
            }, 0) || 0;

          return {
            id: team.id,
            name: team.name,
            team_number: team.team_number,
            track_id: team.track_id,
            room_id: team.room_id,
            track_name: (team.tracks as any)?.name || "",
            room_name: (team.rooms as any)?.name || "",
            total_score: totalScore,
            rank: 0,
          };
        })
      );

      // Sort and assign ranks
      teamsWithScores.sort((a, b) => b.total_score - a.total_score);
      teamsWithScores.forEach((team, index) => {
        team.rank = index + 1;
      });

      setTopTeams(teamsWithScores);

      // Fetch room activities
      let roomActivityQuery = supabase
        .from("rooms")
        .select(
          `
          id,
          name,
          tracks!inner(name)
        `
        );

      if (selectedRoomId) {
        roomActivityQuery = roomActivityQuery.eq("id", selectedRoomId);
      }
      if (selectedTrackId) {
        roomActivityQuery = roomActivityQuery.eq(
          "tracks.id",
          selectedTrackId
        );
      }

      const { data: filteredRoomsData, error: filteredRoomsError } =
        await roomActivityQuery;

      if (filteredRoomsError) throw filteredRoomsError;

      const activities = await Promise.all(
        (filteredRoomsData || []).map(async (room) => {
          const { data: roomTeams } = await supabase
            .from("teams")
            .select("id, name, total_score")
            .eq("room_id", room.id);

          const teamCount = roomTeams?.length || 0;
          const avgScore =
            teamCount > 0
              ? roomTeams!.reduce((sum, t) => sum + Number(t.total_score), 0) /
                teamCount
              : 0;
          const topTeam = roomTeams?.sort(
            (a, b) => Number(b.total_score) - Number(a.total_score)
          )[0];

          return {
            room_id: room.id,
            room_name: room.name,
            track_name: (room.tracks as any)?.name || "",
            team_count: teamCount,
            avg_score: avgScore,
            top_team: topTeam?.name,
            teams: roomTeams || [], // Store all teams for the room
          };
        })
      );

      setRoomActivities(activities);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();

    const channel = supabase
      .channel("public-leaderboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
        },
        () => {
          fetchLeaderboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoomId, selectedTrackId]); // Re-fetch when filters change

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-xl text-foreground">
          Loading live scores...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-4 mb-8">
        <Select
          onValueChange={(value) =>
            setSelectedRoomId(value === "all" ? null : value)
          }
          value={selectedRoomId || "all"}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Classroom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classrooms</SelectItem>
            {allRooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            setSelectedTrackId(value === "all" ? null : value)
          }
          value={selectedTrackId || "all"}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tracks</SelectItem>
            {allTracks.map((track) => (
              <SelectItem key={track.id} value={track.id}>
                {track.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live Classroom Activity */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-8 w-8 text-primary animate-pulse" />
          <h2 className="text-3xl font-bold text-foreground">
            Live Classroom Activity
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomActivities.length > 0 ? (
            roomActivities.map((room) => (
              <Card
                key={room.room_id}
                className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-border hover:border-primary bg-card overflow-hidden animate-in fade-in slide-in-from-bottom duration-700"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-foreground mb-1">
                        {room.room_name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {room.track_name}
                      </Badge>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">Teams Competing</span>
                    <span className="text-2xl font-bold text-primary">
                      {room.team_count}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-foreground/70">Average Score</span>
                      <span className="text-lg font-semibold text-foreground">
                        {room.avg_score.toFixed(1)}
                      </span>
                    </div>
                    <Progress value={(room.avg_score / 100) * 100} className="h-2" />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-foreground/70 mb-2">Teams in this classroom:</p>
                    <div className="flex flex-wrap gap-2">
                      {room.teams.length > 0 ? (
                        room.teams.map((team) => (
                          <Badge key={team.id} variant="outline" className="text-xs">
                            {team.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No teams yet</span>
                      )}
                    </div>
                  </div>
                  {room.top_team && (
                    <div className="pt-2 border-t border-border mt-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-xs text-foreground/70">
                          Leading:{" "}
                        </span>
                        <span className="text-sm font-semibold text-foreground truncate">
                          {room.top_team}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full border-2 border-dashed border-border bg-card">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground/70">
                  No classroom activity found for the selected filters.
                </p>
                <p className="text-sm text-foreground/50 mt-2">
                  Try adjusting your classroom or track selections.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Live Leaderboard */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold text-foreground">Top Performers</h2>
          <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
        </div>
        <div className="grid gap-4">
          {topTeams.length > 0 ? (
            topTeams.map((team, index) => (
              <Card
                key={team.id}
                className={`group transition-all duration-500 hover:scale-102 animate-in fade-in slide-in-from-left duration-700 ${
                  index === 0
                    ? "border-2 border-primary bg-primary/5 shadow-xl"
                    : index === 1
                    ? "border-2 border-muted bg-card shadow-lg"
                    : index === 2
                    ? "border-2 border-muted bg-card shadow-md"
                    : "border border-border bg-card hover:shadow-lg"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    {/* Rank */}
                    <div
                      className={`text-5xl font-bold ${getRankColor(
                        team.rank
                      )} min-w-[80px] text-center group-hover:scale-110 transition-transform`}
                    >
                      {getRankIcon(team.rank)}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-1 truncate">
                            {team.name}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {team.team_number}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {team.track_name}
                            </Badge>
                            <span className="text-xs text-foreground/60 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {team.room_name}
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
                            <span className="text-3xl font-bold text-primary">
                              {team.total_score.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-foreground/60">
                            points
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-2 border-dashed border-border bg-card">
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground/70">
                  No teams have been scored yet for the selected filters.
                </p>
                <p className="text-sm text-foreground/50 mt-2">
                  Check back soon for live updates or adjust your filters!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
