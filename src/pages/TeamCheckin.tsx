import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle, XCircle, Users, Building, FileText, Vote, Activity, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Team {
  id: string;
  name: string;
  team_number: string;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  voting_enabled: boolean;
  voting_opened_at: string | null;
  completed: boolean;
  completed_at: string | null;
  members: string[] | null;
  college: string | null;
  problem_statement: string | null;
  tracks: { name: string };
  rooms: { name: string };
}

const TeamCheckin = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();

    // Subscribe to check-in status changes
    const channel = supabase
      .channel(`team-checkin-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teams",
          filter: `id=eq.${teamId}`,
        },
        (payload) => {
          setTeam((prev) => (prev ? { ...prev, ...payload.new } : null));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const fetchTeam = async () => {
    if (!teamId) {
      setError("No team ID provided");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("teams")
        .select("*, tracks(name), rooms(name)")
        .eq("id", teamId)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Team not found");
      } else {
        setTeam(data as Team);
      }
    } catch (err: any) {
      console.error("Error fetching team:", err);
      setError(err.message || "Failed to load team information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading team information...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || "Team not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Trophy className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Team Check-in
                </h1>
                <p className="text-xs text-muted-foreground">
                  Prodathon Judging System
                </p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Check-in Status Alert */}
        {team.checked_in ? (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Checked In!</strong> Your team has been successfully checked in at{" "}
              {team.checked_in_at ? new Date(team.checked_in_at).toLocaleString() : "unknown time"}.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <XCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Not Checked In</strong> - Please show this QR code to an admin to check in.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team Information Card */}
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle className="text-2xl">{team.name}</CardTitle>
                <CardDescription className="text-base font-semibold">
                  Team #{team.team_number}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Track</p>
                  <p className="text-lg font-medium">{team.tracks.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Room</p>
                  <p className="text-lg font-medium">{team.rooms.name}</p>
                </div>
                {team.college && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Building className="h-4 w-4" /> College
                    </p>
                    <p className="text-base">{team.college}</p>
                  </div>
                )}
                {team.members && team.members.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Users className="h-4 w-4" /> Team Members
                    </p>
                    <ul className="text-sm space-y-1">
                      {team.members.map((member, idx) => (
                        <li key={idx} className="text-foreground">• {member}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {team.problem_statement && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <FileText className="h-4 w-4" /> Problem Statement
                    </p>
                    <p className="text-sm text-foreground">{team.problem_statement}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-in QR Code Card */}
            <Card className="border-2 flex flex-col">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle>Check-in QR Code</CardTitle>
                <CardDescription>
                  Show this code to an admin for check-in
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center pt-6 pb-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <QRCodeSVG
                    value={team.qr_token}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                  This QR code is unique to your team. Present it to check in before your presentation.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Public Voting QR Code Card */}
          <Card className={`border-2 ${team.voting_enabled && !team.completed ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardHeader className={`${team.voting_enabled && !team.completed ? 'bg-gradient-to-r from-primary/20 to-accent/20' : 'bg-gradient-to-r from-primary/10 to-accent/10'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Vote className="h-5 w-5" />
                    Public Voting QR Code
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {team.voting_enabled && !team.completed
                      ? "Share this code for audience voting"
                      : team.completed
                      ? "Voting has been closed"
                      : "Voting will open after check-in"}
                  </CardDescription>
                </div>
                {team.voting_enabled && !team.completed ? (
                  <Badge className="bg-green-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                ) : team.completed ? (
                  <Badge className="bg-gray-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {team.voting_enabled && !team.completed ? (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                      <QRCodeSVG
                        value={`${window.location.origin}/vote/${team.id}`}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Vote className="h-5 w-5 text-primary" />
                        Voting is Open!
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Share this QR code with the audience so they can vote for your team.
                        Votes contribute 10% to your final score.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={() => window.open(`/vote/${team.id}`, '_blank')}
                        className="w-full"
                        size="lg"
                      >
                        <Vote className="h-4 w-4 mr-2" />
                        Open Voting Page
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Voting opened {team.voting_opened_at ? new Date(team.voting_opened_at).toLocaleTimeString() : 'recently'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : team.completed ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-lg mb-2">Voting Completed</h4>
                  <p className="text-sm text-muted-foreground">
                    Thank you! Public voting for your team has been closed.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-semibold text-lg mb-2">Voting Not Yet Open</h4>
                  <p className="text-sm text-muted-foreground">
                    Public voting will be enabled by an admin after your presentation begins.
                    {!team.checked_in && " Make sure to check in first!"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Check-in Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Arrive at the judging venue at your scheduled time</li>
              <li>Locate the registration/admin desk</li>
              <li>Show this QR code to the admin staff</li>
              <li>Wait for confirmation that you've been checked in</li>
              <li>Proceed to your assigned room for presentation</li>
            </ol>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> You can bookmark this page or take a screenshot of the QR code for offline access.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Developed by <span className="font-semibold text-foreground">Nishit R Kirani</span>
            </p>
            <div className="flex items-center justify-center mt-2">
              <img src="/bnmit.svg" alt="BNMIT Logo" className="h-6 w-auto mr-2" />
              <p className="text-xs text-muted-foreground">© 2025 Prodathon</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TeamCheckin;
