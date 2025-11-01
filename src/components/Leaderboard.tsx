import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import TeamDetailDialog from "./TeamDetailDialog";

interface Team {
  id: string;
  name: string;
  team_number: string;
  total_score: number;
  tracks: { name: string };
  rooms: { name: string };
}

interface Track {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
}

interface LeaderboardProps {
  isAdmin?: boolean;
}

const Leaderboard = ({ isAdmin = false }: LeaderboardProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");

  useEffect(() => {
    fetchTracks();
    fetchRooms();
    fetchTeams();

    // Set up real-time subscription
    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTrack, selectedRoom]);

  const fetchTracks = async () => {
    const { data } = await supabase.from("tracks").select("id, name").order("name");
    setTracks(data || []);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("id, name").order("name");
    setRooms(data || []);
  };

  const fetchTeams = async () => {
    let query = supabase
      .from("teams")
      .select("id, name, team_number, tracks(name), rooms(name)");

    if (selectedTrack !== "all") {
      query = query.eq("track_id", selectedTrack);
    }

    if (selectedRoom !== "all") {
      query = query.eq("room_id", selectedRoom);
    }

    const { data } = await query;

    if (data) {
      const teamsWithAverageScores = await Promise.all(
        data.map(async (team) => {
          // Fetch all scores for the team, including judge_id
          const { data: scoresData, error: scoresError } = await supabase
            .from("scores")
            .select("judge_id, score")
            .eq("team_id", team.id);

          if (scoresError) {
            console.error("Error fetching scores for team", team.id, ":", scoresError);
            return { ...team, total_score: 0 };
          }

          // Calculate total score per judge
          const judgeScores = new Map<string, number>();
          scoresData?.forEach((s) => {
            if (s.judge_id) {
              judgeScores.set(s.judge_id, (judgeScores.get(s.judge_id) || 0) + Number(s.score));
            }
          });

          // Sum the scores from each unique judge
          const totalSumOfJudgeScores = Array.from(judgeScores.values()).reduce((sum, score) => sum + score, 0);
          const numberOfJudgesWhoScored = judgeScores.size;

          const averageScore = numberOfJudgesWhoScored > 0 ? totalSumOfJudgeScores / numberOfJudgesWhoScored : 0;

          return {
            ...team,
            total_score: averageScore,
          };
        })
      );

      // Sort by total_score (which is now average score)
      teamsWithAverageScores.sort((a, b) => b.total_score - a.total_score);
      setTeams(teamsWithAverageScores as unknown as Team[]);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">1st Place</Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-gradient-to-r from-gray-300 to-gray-500">2nd Place</Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-amber-700">3rd Place</Badge>
      );
    return <Badge variant="outline">#{rank}</Badge>;
  };

  return (
    <>
      <TeamDetailDialog
        teamId={selectedTeamId}
        teamName={selectedTeamName}
        onClose={() => {
          setSelectedTeamId(null);
          setSelectedTeamName("");
        }}
      />
      
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <p className="text-muted-foreground">Real-time team rankings</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>
            {selectedTrack !== "all" || selectedRoom !== "all"
              ? "Filtered results"
              : "Overall standings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team, index) => (
                <TableRow
                  key={team.id}
                  className={`${index < 3 ? "bg-muted/50" : ""} cursor-pointer hover:bg-accent/50 transition-colors`}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setSelectedTeamName(team.name);
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index + 1)}
                      {getRankBadge(index + 1)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{team.name}</div>
                      <div className="text-xs text-muted-foreground">{team.team_number}</div>
                    </div>
                  </TableCell>
                  <TableCell>{team.tracks.name}</TableCell>
                  <TableCell>{team.rooms.name}</TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {team.total_score.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {teams.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No teams to display. {isAdmin && "Add teams to see the leaderboard."}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
};

export default Leaderboard;
