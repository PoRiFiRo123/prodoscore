import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface TeamWithScores {
  id: string;
  name: string;
  total_score: number;
  scores: any[];
}

export default function TieBreakerAssistant() {
  const { toast } = useToast();
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [scoreDifference, setScoreDifference] = useState<number>(5);
  const [closeTeams, setCloseTeams] = useState<TeamWithScores[]>([]);

  const { data: tracks } = useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*");
      if (error) throw error;
      return data;
    },
  });

  const handleFindTies = async () => {
    if (!selectedTrack) {
      toast({
        title: "Error",
        description: "Please select a track",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: teams, error } = await supabase
        .from("teams")
        .select("id, name, total_score")
        .eq("track_id", selectedTrack)
        .order("total_score", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter teams within score difference
      const ties: TeamWithScores[] = [];
      for (let i = 0; i < (teams?.length || 0) - 1; i++) {
        const team1 = teams![i];
        const team2 = teams![i + 1];

        if (Math.abs((team1.total_score || 0) - (team2.total_score || 0)) <= scoreDifference) {
          // Fetch detailed scores for comparison
          const { data: scores1 } = await supabase
            .from("scores")
            .select("*, criterion_id, criteria(name)")
            .eq("team_id", team1.id);

          const { data: scores2 } = await supabase
            .from("scores")
            .select("*, criterion_id, criteria(name)")
            .eq("team_id", team2.id);

          if (!ties.find((t) => t.id === team1.id)) {
            ties.push({ ...team1, scores: scores1 || [] });
          }
          if (!ties.find((t) => t.id === team2.id)) {
            ties.push({ ...team2, scores: scores2 || [] });
          }
        }
      }

      setCloseTeams(ties);

      if (ties.length === 0) {
        toast({
          title: "No Ties Found",
          description: `No teams within ${scoreDifference} points of each other`,
        });
      }
    } catch (error: any) {
      console.error("Error finding ties:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tie-Breaker Assistant
          </CardTitle>
          <CardDescription>
            Identify teams with close scores for detailed comparison
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Track</label>
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger>
                  <SelectValue placeholder="Select track" />
                </SelectTrigger>
                <SelectContent>
                  {tracks?.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Score Difference</label>
              <Input
                type="number"
                value={scoreDifference}
                onChange={(e) => setScoreDifference(Number(e.target.value))}
                min={1}
                max={100}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleFindTies} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Find Close Matches
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {closeTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teams with Close Scores</CardTitle>
            <CardDescription>
              {closeTeams.length} team(s) within {scoreDifference} points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {closeTeams.map((team, index) => (
                <div key={team.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                      <h3 className="font-semibold">{team.name}</h3>
                    </div>
                    <div className="text-lg font-bold">
                      {team.total_score?.toFixed(2) || 0}
                    </div>
                  </div>

                  {team.scores.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Criterion</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Judge</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.scores.map((score: any) => (
                          <TableRow key={score.id}>
                            <TableCell className="text-sm">
                              {score.criteria?.name || "Unknown"}
                            </TableCell>
                            <TableCell className="font-medium">{score.score}</TableCell>
                            <TableCell className="text-sm">
                              {score.judge_name || "Unknown"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
