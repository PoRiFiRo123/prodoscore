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
  judge_score: number;
  public_score: number;
  weighted_score: number;
  public_votes_count: number;
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

    // Set up real-time subscription for both judge scores and public votes
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "public_votes",
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
      const teamsWithScores = await Promise.all(
        data.map(async (team) => {
          // Fetch judge scores
          const { data: scoresData, error: scoresError } = await supabase
            .from("scores")
            .select("judge_id, score")
            .eq("team_id", team.id);

          if (scoresError) {
            console.error("Error fetching scores for team", team.id, ":", scoresError);
          }

          // Calculate judge average score
          const judgeScores = new Map<string, number>();
          scoresData?.forEach((s) => {
            if (s.judge_id) {
              judgeScores.set(s.judge_id, (judgeScores.get(s.judge_id) || 0) + Number(s.score));
            }
          });

          const totalSumOfJudgeScores = Array.from(judgeScores.values()).reduce((sum, score) => sum + score, 0);
          const numberOfJudgesWhoScored = judgeScores.size;
          const judgeScore = numberOfJudgesWhoScored > 0 ? totalSumOfJudgeScores / numberOfJudgesWhoScored : 0;

          // Fetch public votes
          const { data: publicVotesData } = await supabase
            .from("public_votes")
            .select("score, session_id")
            .eq("team_id", team.id);

          // Calculate public vote average (average all scores)
          const publicScores = publicVotesData || [];
          const totalPublicScore = publicScores.reduce((sum, vote) => sum + Number(vote.score), 0);
          const publicScore = publicScores.length > 0 ? totalPublicScore / publicScores.length : 0;

          // Get unique voters count
          const uniqueVoters = new Set(publicScores.map(v => v.session_id));
          const publicVotesCount = uniqueVoters.size;

          // Calculate weighted score: 90% judge + 10% public
          const weightedScore = (judgeScore * 0.9) + (publicScore * 0.1);

          return {
            ...team,
            total_score: judgeScore, // Keep for backward compatibility
            judge_score: judgeScore,
            public_score: publicScore,
            weighted_score: weightedScore,
            public_votes_count: publicVotesCount,
          };
        })
      );

      // Sort by weighted_score
      teamsWithScores.sort((a, b) => b.weighted_score - a.weighted_score);
      setTeams(teamsWithScores as unknown as Team[]);
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
                <TableHead className="text-right">Judge Score (90%)</TableHead>
                <TableHead className="text-right">Public Score (10%)</TableHead>
                <TableHead className="text-right">Final Score</TableHead>
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
                  <TableCell className="text-right">
                    <div className="font-medium">{team.judge_score.toFixed(1)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">{team.public_score.toFixed(1)}</div>
                    {team.public_votes_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {team.public_votes_count} votes
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-lg text-primary">
                      {team.weighted_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({(team.judge_score * 0.9).toFixed(1)} + {(team.public_score * 0.1).toFixed(1)})
                    </div>
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
