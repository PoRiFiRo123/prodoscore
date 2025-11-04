import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Vote,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  Eye,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeamVotingData {
  id: string;
  name: string;
  team_number: string;
  voting_enabled: boolean;
  voting_opened_at: string | null;
  completed: boolean;
  completed_at: string | null;
  tracks: { name: string };
  vote_count: number;
  average_score: number;
  total_votes: number;
}

interface VotingStats {
  totalVoters: number;
  totalVotes: number;
  activeVotingTeams: number;
  completedTeams: number;
  averageVotesPerTeam: number;
  mostVotedTeam: TeamVotingData | null;
}

interface RecentActivity {
  team_name: string;
  voted_at: string;
  score: number;
  criterion_name: string;
}

export default function VotingAnalytics() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamVotingData[]>([]);
  const [stats, setStats] = useState<VotingStats>({
    totalVoters: 0,
    totalVotes: 0,
    activeVotingTeams: 0,
    completedTeams: 0,
    averageVotesPerTeam: 0,
    mostVotedTeam: null,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVotingData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('voting-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchVotingData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_votes' }, fetchVotingData)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchVotingData = async () => {
    setLoading(true);

    // Fetch teams with voting data
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("*, tracks(name)")
      .order("team_number");

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      setLoading(false);
      return;
    }

    // Fetch all public votes for statistics
    const { data: allVotes } = await supabase
      .from("public_votes")
      .select("*, teams(name), criteria(name)");

    // Calculate vote counts and averages for each team
    const teamsWithVotes = await Promise.all(
      (teamsData || []).map(async (team) => {
        const { data: votes } = await supabase
          .from("public_votes")
          .select("score, session_id")
          .eq("team_id", team.id);

        const uniqueSessions = new Set(votes?.map(v => v.session_id) || []);
        const voteCount = uniqueSessions.size;
        const totalVotes = votes?.length || 0;
        const averageScore = totalVotes > 0
          ? votes!.reduce((sum, v) => sum + Number(v.score), 0) / totalVotes
          : 0;

        return {
          ...team,
          vote_count: voteCount,
          average_score: averageScore,
          total_votes: totalVotes,
        };
      })
    );

    setTeams(teamsWithVotes as TeamVotingData[]);

    // Calculate overall statistics
    const allSessions = new Set(allVotes?.map(v => v.session_id) || []);
    const activeVoting = teamsWithVotes.filter(t => t.voting_enabled && !t.completed).length;
    const completed = teamsWithVotes.filter(t => t.completed).length;
    const totalTeamVotes = teamsWithVotes.reduce((sum, t) => sum + t.vote_count, 0);
    const avgVotesPerTeam = teamsWithVotes.length > 0 ? totalTeamVotes / teamsWithVotes.length : 0;
    const mostVoted = teamsWithVotes.reduce((max, team) =>
      team.vote_count > (max?.vote_count || 0) ? team : max
    , teamsWithVotes[0] || null);

    setStats({
      totalVoters: allSessions.size,
      totalVotes: allVotes?.length || 0,
      activeVotingTeams: activeVoting,
      completedTeams: completed,
      averageVotesPerTeam: avgVotesPerTeam,
      mostVotedTeam: mostVoted,
    });

    // Get recent voting activity
    const recentVotes = (allVotes || [])
      .sort((a, b) => new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime())
      .slice(0, 10)
      .map(vote => ({
        team_name: vote.teams.name,
        voted_at: vote.voted_at,
        score: vote.score,
        criterion_name: vote.criteria.name,
      }));

    setRecentActivity(recentVotes);
    setLoading(false);
  };

  const getVotingStatus = (team: TeamVotingData) => {
    if (team.completed) {
      return { label: "Completed", color: "bg-gray-500", icon: CheckCircle };
    }
    if (team.voting_enabled) {
      return { label: "Active", color: "bg-green-500", icon: Activity };
    }
    return { label: "Not Started", color: "bg-gray-400", icon: XCircle };
  };

  const formatDuration = (startTime: string | null) => {
    if (!startTime) return "N/A";
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m ago`;
    }
    return `${diffMins}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading voting analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Vote className="h-8 w-8 text-primary" />
            Public Voting Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Live statistics and detailed insights into public voting
          </p>
        </div>
        <Button onClick={() => navigate("/public-voting")} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          View Public Page
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Voters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalVoters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique participants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Total Votes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalVotes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all criteria
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Voting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activeVotingTeams}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Teams open for voting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Avg Votes/Team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.averageVotesPerTeam.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per team average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Most Voted Team Highlight */}
      {stats.mostVotedTeam && stats.mostVotedTeam.vote_count > 0 && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Most Voted Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{stats.mostVotedTeam.name}</h3>
                <p className="text-muted-foreground">
                  {stats.mostVotedTeam.team_number} • {stats.mostVotedTeam.tracks.name}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {stats.mostVotedTeam.vote_count}
                </div>
                <p className="text-sm text-muted-foreground">votes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {stats.mostVotedTeam.average_score.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams Voting Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teams Voting Status</CardTitle>
          <CardDescription>
            Detailed breakdown of voting activity per team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Voters</TableHead>
                <TableHead className="text-right">Total Votes</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams
                .sort((a, b) => {
                  // Sort by voting status, then by vote count
                  if (a.voting_enabled && !b.voting_enabled) return -1;
                  if (!a.voting_enabled && b.voting_enabled) return 1;
                  return b.vote_count - a.vote_count;
                })
                .map((team) => {
                  const status = getVotingStatus(team);
                  const StatusIcon = status.icon;
                  const participationRate = team.vote_count > 0
                    ? Math.min((team.vote_count / stats.totalVoters) * 100, 100)
                    : 0;

                  return (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{team.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {team.team_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{team.tracks.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold">{team.vote_count}</div>
                        {stats.totalVoters > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {participationRate.toFixed(0)}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{team.total_votes}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {team.average_score.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {team.voting_enabled || team.completed
                          ? formatDuration(team.voting_opened_at)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vote/${team.id}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Voting Activity
          </CardTitle>
          <CardDescription>
            Last 10 votes cast across all teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No voting activity yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Vote className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{activity.team_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {activity.criterion_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{activity.score}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.voted_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voting Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Voting Progress Overview</CardTitle>
          <CardDescription>
            Completion status across all teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Teams Completed</span>
              <span className="font-medium">
                {stats.completedTeams} / {teams.length}
              </span>
            </div>
            <Progress
              value={(stats.completedTeams / teams.length) * 100}
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Active Voting Sessions</span>
              <span className="font-medium">
                {stats.activeVotingTeams} / {teams.length}
              </span>
            </div>
            <Progress
              value={(stats.activeVotingTeams / teams.length) * 100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
