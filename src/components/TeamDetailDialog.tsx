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

const TeamDetailDialog = ({ teamId, teamName, onClose }: TeamDetailDialogProps) => {
  const [scores, setScores] = useState<ScoreDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchScoreDetails();
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

  // Group scores by judge
  const scoresByJudge = scores.reduce((acc, score) => {
    const judgeName = score.judge_name || "Anonymous";
    if (!acc[judgeName]) {
      acc[judgeName] = [];
    }
    acc[judgeName].push(score);
    return acc;
  }, {} as Record<string, ScoreDetail[]>);

  // Calculate total score
  const totalScore = scores.reduce((sum, s) => sum + Number(s.score), 0);

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
          {/* Total Score */}
          <Card>
            <CardHeader>
              <CardTitle>Total Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {totalScore.toFixed(1)} points
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamDetailDialog;
