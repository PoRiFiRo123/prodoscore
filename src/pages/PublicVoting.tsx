import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Vote, CheckCircle, Lock, Trophy, Search } from "lucide-react";

interface Team {
  id: string;
  name: string;
  team_number: string;
  college: string | null;
  members: string[] | null;
  checked_in: boolean;
  voting_enabled: boolean;
  completed: boolean;
  tracks: { name: string };
  rooms: { name: string };
  vote_count?: number;
}

export default function PublicVoting() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [tracks, setTracks] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchTeams();
    fetchTracks();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('public-voting-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          fetchTeams();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'public_votes' },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTeams();
  }, [teams, searchQuery, filterTrack, filterStatus]);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*, tracks(name), rooms(name)")
      .order("team_number");

    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }

    // Fetch vote counts for each team (count unique sessions)
    const teamsWithVotes = await Promise.all(
      (data || []).map(async (team) => {
        const { data: votes } = await supabase
          .from("public_votes")
          .select("session_id")
          .eq("team_id", team.id);

        // Count unique sessions
        const uniqueSessions = new Set(votes?.map(v => v.session_id) || []);
        const voteCount = uniqueSessions.size;

        return { ...team, vote_count: voteCount };
      })
    );

    setTeams(teamsWithVotes as Team[]);
  };

  const fetchTracks = async () => {
    const { data } = await supabase
      .from("tracks")
      .select("id, name")
      .order("name");

    setTracks(data || []);
  };

  const filterTeams = () => {
    let filtered = [...teams];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.name.toLowerCase().includes(query) ||
          team.team_number.toLowerCase().includes(query) ||
          team.college?.toLowerCase().includes(query)
      );
    }

    // Track filter
    if (filterTrack !== "all") {
      filtered = filtered.filter((team) => team.tracks.name === filterTrack);
    }

    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "voting":
          filtered = filtered.filter((team) => team.voting_enabled && !team.completed);
          break;
        case "waiting":
          filtered = filtered.filter((team) => !team.checked_in);
          break;
        case "presenting":
          filtered = filtered.filter((team) => team.checked_in && !team.voting_enabled);
          break;
        case "completed":
          filtered = filtered.filter((team) => team.completed);
          break;
      }
    }

    // Sort: voting-enabled teams first, then by team_number
    filtered.sort((a, b) => {
      // Priority 1: Teams with voting enabled (and not completed) come first
      const aVoting = a.voting_enabled && !a.completed ? 1 : 0;
      const bVoting = b.voting_enabled && !b.completed ? 1 : 0;
      if (aVoting !== bVoting) return bVoting - aVoting;

      // Priority 2: Sort by team_number
      return a.team_number.localeCompare(b.team_number);
    });

    setFilteredTeams(filtered);
  };

  const getTeamStatus = (team: Team) => {
    if (team.completed) {
      return { status: "completed", label: "Completed", color: "bg-gray-500", icon: CheckCircle };
    }
    if (team.voting_enabled && !team.completed) {
      return { status: "voting", label: "Vote Now!", color: "bg-primary", icon: Vote };
    }
    if (team.checked_in) {
      return { status: "presenting", label: "Presenting", color: "bg-yellow-500", icon: Clock };
    }
    return { status: "waiting", label: "Waiting", color: "bg-gray-400", icon: Lock };
  };

  const handleVote = (teamId: string) => {
    navigate(`/vote/${teamId}`);
  };

  const votingTeams = filteredTeams.filter(t => t.voting_enabled && !t.completed);
  const totalVotes = teams.reduce((sum, t) => sum + (t.vote_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">
                Prodathon Public Voting
              </h1>
            </button>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{teams.length}</div>
                <div className="text-xs text-muted-foreground">Total Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{votingTeams.length}</div>
                <div className="text-xs text-muted-foreground">Voting Open</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalVotes}</div>
                <div className="text-xs text-muted-foreground">Total Votes</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterTrack} onValueChange={setFilterTrack}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tracks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracks</SelectItem>
                  {tracks.map((track) => (
                    <SelectItem key={track.id} value={track.name}>
                      {track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="voting">🔥 Voting Open</SelectItem>
                  <SelectItem value="presenting">⏱️ Presenting</SelectItem>
                  <SelectItem value="waiting">⏳ Waiting</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const statusInfo = getTeamStatus(team);
            const Icon = statusInfo.icon;

            return (
              <Card
                key={team.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {team.team_number}
                      </CardDescription>
                    </div>
                    <Badge className={`${statusInfo.color} text-white`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    <span>{team.tracks.name}</span>
                  </div>
                  {team.college && (
                    <div className="text-sm text-muted-foreground">
                      🏫 {team.college}
                    </div>
                  )}
                  {team.members && team.members.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{team.members.length} members</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Vote className="h-4 w-4" />
                    <span>{team.vote_count || 0} votes</span>
                  </div>

                  {team.voting_enabled && !team.completed ? (
                    <Button
                      onClick={() => handleVote(team.id)}
                      className="w-full"
                    >
                      <Vote className="h-4 w-4 mr-2" />
                      Vote Now!
                    </Button>
                  ) : team.completed ? (
                    <Button disabled className="w-full" variant="outline">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Voting Closed
                    </Button>
                  ) : (
                    <Button disabled className="w-full" variant="outline">
                      <Lock className="h-4 w-4 mr-2" />
                      Voting Not Open
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-lg">No teams found</div>
          </div>
        )}
      </main>
    </div>
  );
}
