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

    // Fetch vote counts for each team
    const teamsWithVotes = await Promise.all(
      (data || []).map(async (team) => {
        const { count } = await supabase
          .from("public_votes")
          .select("session_id", { count: 'exact', head: true })
          .eq("team_id", team.id);

        return { ...team, vote_count: count || 0 };
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

    setFilteredTeams(filtered);
  };

  const getTeamStatus = (team: Team) => {
    if (team.completed) {
      return { status: "completed", label: "Completed", color: "bg-green-500", icon: CheckCircle };
    }
    if (team.voting_enabled && !team.completed) {
      return { status: "voting", label: "Vote Now!", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: Vote, pulsing: true };
    }
    if (team.checked_in) {
      return { status: "presenting", label: "Presenting", color: "bg-yellow-500", icon: Clock };
    }
    return { status: "waiting", label: "Waiting", color: "bg-gray-500", icon: Lock };
  };

  const handleVote = (teamId: string) => {
    navigate(`/vote/${teamId}`);
  };

  const votingTeams = filteredTeams.filter(t => t.voting_enabled && !t.completed);
  const totalVotes = teams.reduce((sum, t) => sum + (t.vote_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-white mb-2">
              🏆 Prodathon Public Voting
            </h1>
            <p className="text-xl text-purple-200">
              Vote for your favorite teams and help decide the winners!
            </p>
            <div className="flex justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{teams.length}</div>
                <div className="text-sm text-purple-200">Total Teams</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{votingTeams.length}</div>
                <div className="text-sm text-purple-200">Voting Open</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{totalVotes}</div>
                <div className="text-sm text-purple-200">Total Votes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-gray-300"
                />
              </div>
              <Select value={filterTrack} onValueChange={setFilterTrack}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
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
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
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
      </div>

      {/* Team Grid */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team, index) => {
            const statusInfo = getTeamStatus(team);
            const Icon = statusInfo.icon;

            return (
              <Card
                key={team.id}
                className={`group transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white/10 backdrop-blur-lg border-white/20 overflow-hidden ${
                  statusInfo.pulsing ? 'animate-pulse-slow' : ''
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards',
                }}
              >
                <CardHeader className="relative">
                  <div className={`absolute top-0 right-0 h-32 w-32 ${statusInfo.color} opacity-20 blur-3xl`}></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold text-white group-hover:text-purple-200 transition-colors">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="text-purple-200 mt-1">
                        {team.team_number}
                      </CardDescription>
                    </div>
                    <Badge className={`${statusInfo.color} text-white border-0`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-purple-200">
                    <Trophy className="h-4 w-4" />
                    <span>{team.tracks.name}</span>
                  </div>
                  {team.college && (
                    <div className="text-sm text-purple-200/80">
                      🏫 {team.college}
                    </div>
                  )}
                  {team.members && team.members.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-purple-200/80">
                      <Users className="h-4 w-4" />
                      <span>{team.members.length} members</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-purple-200/80">
                    <Vote className="h-4 w-4" />
                    <span>{team.vote_count || 0} votes</span>
                  </div>

                  {team.voting_enabled && !team.completed ? (
                    <Button
                      onClick={() => handleVote(team.id)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg"
                    >
                      <Vote className="h-4 w-4 mr-2" />
                      Vote Now!
                    </Button>
                  ) : team.completed ? (
                    <Button disabled className="w-full bg-green-500/50 text-white">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Voting Closed
                    </Button>
                  ) : (
                    <Button disabled className="w-full bg-gray-500/50 text-white">
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
            <div className="text-gray-400 text-lg">No teams found</div>
          </div>
        )}
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
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
