import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TeamDetailDialogProps {
  teamId: string | null;
  teamName: string;
  onClose: () => void;
}

interface ScoreDetail {
  id: string;
  score: number;
  comment: string | null;
  judge_name: string | null;
  criteria: {
    name: string;
    max_score: number;
  };
}

interface PublicVoteDetail {
  score: number;
  session_id: string;
  voted_at: string;
  criteria: {
    name: string;
  };
}

const TeamDetailDialog = ({ teamId, teamName, onClose }: TeamDetailDialogProps) => {
  const [scores, setScores] = useState<ScoreDetail[]>([]);
  const [publicVotes, setPublicVotes] = useState<PublicVoteDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchScoreDetails();
      fetchPublicVotes();
    }
  }, [teamId]);

  const fetchScoreDetails = async () => {
    if (!teamId) return;
    setLoading(true);

    const { data } = await supabase
      .from("scores")
      .select("id, score, comment, judge_name, criteria(name, max_score)")
      .eq("team_id", teamId);

    setScores((data as any) || []);
    setLoading(false);
  };

  const fetchPublicVotes = async () => {
    if (!teamId) return;

    const { data } = await supabase
      .from("public_votes")
      .select("score, session_id, voted_at, criteria(name)")
      .eq("team_id", teamId);

    setPublicVotes((data as any) || []);
  };

  // Group scores by judge
  const scoresByJudge = scores.reduce((acc, score) => {
    const judgeName = score.judge_name || "Anonymous";
    if (!acc[judgeName]) {
      acc[judgeName] = [];
    }
    acc[judgeName].push(score);
    return acc;
  }, {} as Record<string, ScoreDetail[]>);

  // Calculate average of judge's total scores
  const judgeTotals = Object.values(scoresByJudge).map((judgeScores) =>
    judgeScores.reduce((sum, s) => sum + Number(s.score), 0)
  );

  const averageTotalScore = judgeTotals.length > 0
    ? judgeTotals.reduce((sum, total) => sum + total, 0) / judgeTotals.length
    : 0;

  // Calculate public voting statistics
  const uniqueVoters = new Set(publicVotes.map(v => v.session_id));
  const publicVotesCount = uniqueVoters.size;

  const totalPublicScore = publicVotes.reduce((sum, vote) => sum + Number(vote.score), 0);
  const averagePublicScore = publicVotes.length > 0 ? totalPublicScore / publicVotes.length : 0;

  // Group public votes by criteria
  const publicVotesByCriteria = publicVotes.reduce((acc, vote) => {
    const criteriaName = vote.criteria.name;
    if (!acc[criteriaName]) {
      acc[criteriaName] = [];
    }
    acc[criteriaName].push(vote);
    return acc;
  }, {} as Record<string, PublicVoteDetail[]>);

  // Calculate weighted final score (90% judge + 10% public)
  const weightedFinalScore = (averageTotalScore * 0.9) + (averagePublicScore * 0.1);

  return (
    <Dialog open={!!teamId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{teamName} - Score Breakdown</DialogTitle>
          <DialogDescription>
            Detailed evaluation from all judges
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Final Weighted Score */}
          <Card>
            <CardHeader>
              <CardTitle>Final Score (90% Judges + 10% Public)</CardTitle>
              <CardDescription>
                Weighted average combining judge evaluations and public voting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {weightedFinalScore.toFixed(1)} points
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Judge Score: {averageTotalScore.toFixed(1)} × 0.9 = {(averageTotalScore * 0.9).toFixed(1)} |
                Public Score: {averagePublicScore.toFixed(1)} × 0.1 = {(averagePublicScore * 0.1).toFixed(1)}
              </div>
            </CardContent>
          </Card>

          {/* Scores by Judge */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading scores...</div>
          ) : Object.keys(scoresByJudge).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scores submitted yet
            </div>
          ) : (
            Object.entries(scoresByJudge).map(([judgeName, judgeScores]) => {
              const judgeTotal = judgeScores.reduce((sum, s) => sum + Number(s.score), 0);
              const comment = judgeScores.find(s => s.comment)?.comment;

              return (
                <Card key={judgeName}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{judgeName}</CardTitle>
                        <CardDescription>
                          Judge's Total: {judgeTotal.toFixed(1)} points
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Criterion</TableHead>
                          <TableHead className="text-right">Max Score</TableHead>
                          <TableHead className="text-right">Score Given</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {judgeScores.map((score) => (
                          <TableRow key={score.id}>
                            <TableCell className="font-medium">
                              {score.criteria.name}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {score.criteria.max_score}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-base">
                                {Number(score.score).toFixed(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {comment && (
                      <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                        <div className="text-sm font-semibold mb-2">Judge's Comments:</div>
                        <p className="text-sm text-muted-foreground italic">"{comment}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Public Voting Summary */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Public Voting Summary</CardTitle>
                  <CardDescription>
                    Anonymous votes from students
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-base">
                  {publicVotesCount} {publicVotesCount === 1 ? 'voter' : 'voters'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicVotesCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No public votes received yet
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Votes</div>
                      <div className="text-2xl font-bold">{publicVotes.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                      <div className="text-2xl font-bold text-primary">
                        {averagePublicScore.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {Object.keys(publicVotesByCriteria).length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-semibold mb-2">Score Breakdown by Criteria</div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Criterion</TableHead>
                            <TableHead className="text-right">Votes</TableHead>
                            <TableHead className="text-right">Average Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(publicVotesByCriteria).map(([criteriaName, votes]) => {
                            const avgScore = votes.reduce((sum, v) => sum + Number(v.score), 0) / votes.length;
                            return (
                              <TableRow key={criteriaName}>
                                <TableCell className="font-medium">{criteriaName}</TableCell>
                                <TableCell className="text-right">{votes.length}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="text-base">
                                    {avgScore.toFixed(1)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamDetailDialog;
