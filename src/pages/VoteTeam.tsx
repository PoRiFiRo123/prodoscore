import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Users, Building, Clock, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";

interface Team {
  id: string;
  name: string;
  team_number: string;
  college: string | null;
  members: string[] | null;
  problem_statement: string | null;
  voting_enabled: boolean;
  completed: boolean;
  tracks: { id: string; name: string };
}

interface Criterion {
  id: string;
  name: string;
  max_score: number;
}

export default function VoteTeam() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const { width, height } = useWindowSize();

  // Generate or retrieve session ID
  const getSessionId = () => {
    let sessionId = localStorage.getItem('voting_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('voting_session_id', sessionId);
    }
    return sessionId;
  };

  useEffect(() => {
    if (teamId) {
      fetchTeam();
      checkIfVoted();
      fetchVoteCount();
    }
  }, [teamId]);

  // Auto-redirect if voting is not available
  useEffect(() => {
    if (team && (!team.voting_enabled || team.completed)) {
      const timer = setTimeout(() => {
        navigate("/public-voting");
      }, 3000); // Redirect after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [team, navigate]);

  useEffect(() => {
    if (team) {
      fetchCriteria();
    }
  }, [team]);

  const fetchTeam = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*, tracks(id, name)")
      .eq("id", teamId)
      .single();

    if (error) {
      console.error("Error fetching team:", error);
      toast({
        title: "Error",
        description: "Failed to load team details",
        variant: "destructive",
      });
      return;
    }

    setTeam(data as Team);
  };

  const fetchCriteria = async () => {
    if (!team) return;

    const { data, error } = await supabase
      .from("criteria")
      .select("id, name, max_score")
      .eq("track_id", team.tracks.id)
      .order("display_order");

    if (error) {
      console.error("Error fetching criteria:", error);
      return;
    }

    setCriteria((data as Criterion[]) || []);

    // Initialize scores to 0
    const initialScores: Record<string, number> = {};
    (data || []).forEach((c) => {
      initialScores[c.id] = 0;
    });
    setScores(initialScores);
  };

  const checkIfVoted = async () => {
    const sessionId = getSessionId();
    const { data } = await supabase
      .from("public_votes")
      .select("id")
      .eq("team_id", teamId)
      .eq("session_id", sessionId)
      .limit(1);

    setHasVoted((data && data.length > 0) || false);
  };

  const fetchVoteCount = async () => {
    const { data } = await supabase
      .from("public_votes")
      .select("session_id")
      .eq("team_id", teamId);

    // Count unique sessions
    const uniqueSessions = new Set(data?.map(v => v.session_id) || []);
    setVoteCount(uniqueSessions.size);
  };

  const handleScoreChange = (criterionId: string, value: number) => {
    setScores({ ...scores, [criterionId]: value });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage < 33) return "from-red-500 to-orange-500";
    if (percentage < 66) return "from-yellow-500 to-green-500";
    return "from-green-500 to-emerald-500";
  };

  const getScoreEmoji = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage === 0) return "😐";
    if (percentage < 33) return "😕";
    if (percentage < 50) return "😊";
    if (percentage < 75) return "😃";
    if (percentage < 90) return "🤩";
    return "🔥";
  };

  const calculateProgress = () => {
    const totalCriteria = criteria.length;
    const scoredCriteria = Object.values(scores).filter(s => s > 0).length;
    return (scoredCriteria / totalCriteria) * 100;
  };

  const handleSubmit = async () => {
    if (!team) return;

    // Validate that all criteria have been scored
    const allScored = Object.values(scores).every(s => s > 0);
    if (!allScored) {
      toast({
        title: "Incomplete Voting",
        description: "Please rate all categories before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const sessionId = getSessionId();

      // Insert votes for each criterion
      const votes = criteria.map((criterion) => ({
        team_id: team.id,
        criterion_id: criterion.id,
        score: scores[criterion.id],
        session_id: sessionId,
      }));

      const { error } = await supabase.from("public_votes").insert(votes);

      if (error) throw error;

      setShowConfetti(true);
      setHasVoted(true);
      fetchVoteCount();

      toast({
        title: "🎉 Vote Submitted!",
        description: "Thank you for voting!",
      });

      // Hide confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error: any) {
      console.error("Error submitting vote:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit vote",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!team.voting_enabled || team.completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-yellow-500" />
              Voting Not Available
            </CardTitle>
            <CardDescription>
              Voting for this team is currently {team.completed ? "closed" : "not open yet"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4 bg-secondary rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Redirecting to all teams in 3 seconds...
              </p>
            </div>
            <Button onClick={() => navigate("/public-voting")} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Teams Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Already Voted!</CardTitle>
            <CardDescription className="text-center">
              You've already voted for {team.name}. Thank you for your participation!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4 bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">{voteCount}</div>
              <div className="text-sm text-muted-foreground">Total Votes for this team</div>
            </div>
            <Button onClick={() => navigate("/public-voting")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vote for Other Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-background">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

      {/* Header */}
      <header className="border-b bg-card backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            onClick={() => navigate("/public-voting")}
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Team Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-bold mb-2">
                  {team.name}
                </CardTitle>
                <CardDescription className="text-lg">
                  {team.team_number}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Total Votes</div>
                <div className="text-2xl font-bold text-primary">{voteCount}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="h-5 w-5" />
                <span>{team.tracks.name}</span>
              </div>
              {team.college && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-5 w-5" />
                  <span>{team.college}</span>
                </div>
              )}
              {team.members && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-5 w-5" />
                  <span>{team.members.length} members</span>
                </div>
              )}
            </div>
            {team.problem_statement && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold mb-2">Problem Statement</div>
                <div className="text-sm text-muted-foreground">{team.problem_statement}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Your Progress</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Voting Criteria */}
        <div className="space-y-4">
          {criteria.map((criterion, index) => {
            const score = scores[criterion.id] || 0;
            const color = getScoreColor(score, criterion.max_score);
            const emoji = getScoreEmoji(score, criterion.max_score);

            return (
              <Card
                key={criterion.id}
                className="transition-all duration-300 hover:shadow-lg"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards',
                }}
              >
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {criterion.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{emoji}</span>
                    <div className="text-right">
                      <div className={`text-4xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                        {score}
                      </div>
                      <div className="text-sm text-muted-foreground">out of {criterion.max_score}</div>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={criterion.max_score}
                    value={score}
                    onChange={(e) => handleScoreChange(criterion.id, Number(e.target.value))}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, rgb(147 51 234) 0%, rgb(219 39 119) ${(score / criterion.max_score) * 100}%, rgb(75 85 99) ${(score / criterion.max_score) * 100}%, rgb(75 85 99) 100%)`,
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit Button */}
        <Card className="mt-6 sticky bottom-4">
          <CardContent className="pt-6">
            <Button
              onClick={handleSubmit}
              disabled={submitting || progress < 100}
              className="w-full h-14 text-lg font-semibold"
            >
              {submitting ? (
                <>
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : progress < 100 ? (
                <>Complete all ratings to submit</>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Submit Vote
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s;
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}
