import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users as UsersIcon, Edit, CheckCircle, XCircle, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";

interface Team {
  id: string;
  name: string;
  team_number: string;
  members: string[] | null;
  college: string | null;
  email: string | null;
  total_score: number;
  problem_statement: string | null;
  track_id: string;
  room_id: string;
  checked_in: boolean;
  checked_in_at: string | null;
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
  track_id: string;
}

const AdminTeams = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    team_number: "",
    track_id: "",
    room_id: "",
    members: "",
    college: "",
    email: "",
    problem_statement: "",
  });

  useEffect(() => {
    fetchTracks();
    fetchRooms();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (formData.track_id) {
      setFilteredRooms(rooms.filter((r) => r.track_id === formData.track_id));
    } else {
      setFilteredRooms([]);
    }
  }, [formData.track_id, rooms]);

  const fetchTracks = async () => {
    const { data } = await supabase.from("tracks").select("id, name").order("name");
    setTracks(data || []);
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, name, track_id")
      .order("name");
    setRooms(data || []);
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*, tracks(name), rooms(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching teams",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const teamsWithScores = await Promise.all(
        (data || []).map(async (team) => {
          const { data: scores } = await supabase
            .from("scores")
            .select("score")
            .eq("team_id", team.id);

          const totalScore =
            scores?.reduce((sum, s) => sum + Number(s.score), 0) || 0;

          return {
            ...team,
            total_score: totalScore,
          };
        })
      );
      setTeams(teamsWithScores);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setEditingTeam(null);
      resetFormData();
    }
    setOpen(isOpen);
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      team_number: "",
      track_id: "",
      room_id: "",
      members: "",
      college: "",
      email: "",
      problem_statement: "",
    });
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      team_number: team.team_number,
      track_id: team.track_id,
      room_id: team.room_id,
      members: team.members?.join(", ") || "",
      college: team.college || "",
      email: team.email || "",
      problem_statement: team.problem_statement || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const membersArray = formData.members
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m);

    const dataToSubmit = {
      name: formData.name,
      team_number: formData.team_number,
      track_id: formData.track_id,
      room_id: formData.room_id,
      members: membersArray,
      college: formData.college || null,
      email: formData.email || null,
      problem_statement: formData.problem_statement || null,
    };

    let error;

    if (editingTeam) {
      // Update
      const oldTeam = { ...editingTeam };
      const { data: updatedTeam, error: updateError } = await supabase
        .from("teams")
        .update(dataToSubmit)
        .eq("id", editingTeam.id)
        .select()
        .single();
      error = updateError;

      if (!error) {
        logAdminAction("TEAM_UPDATED", "teams", editingTeam.id, oldTeam, updatedTeam);
      }
    } else {
      // Create
      const { data: newTeam, error: insertError } = await supabase
        .from("teams")
        .insert([dataToSubmit])
        .select()
        .single();
      error = insertError;

      if (!error) {
        logAdminAction("TEAM_CREATED", "teams", newTeam.id, null, newTeam);
      }
    }

    if (error) {
      toast({
        title: `Error ${editingTeam ? "updating" : "creating"} team`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: `Team ${editingTeam ? "updated" : "created"}`,
        description: `Team has been ${
          editingTeam ? "updated" : "created"
        } successfully.`,
      });
      fetchTeams();
      handleOpenChange(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    const { data: oldTeamData } = await supabase.from("teams").select("*").eq("id", id).single();

    const { error } = await supabase.from("teams").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully.",
      });
      logAdminAction("TEAM_DELETED", "teams", id, oldTeamData, null);
      fetchTeams();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-muted-foreground">Manage participating teams</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? "Edit Team" : "Create Team"}
              </DialogTitle>
              <DialogDescription>
                {editingTeam
                  ? "Update the details of the team."
                  : "Add a new participating team"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Team Alpha"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-number">Team Number</Label>
                  <Input
                    id="team-number"
                    value={formData.team_number}
                    onChange={(e) =>
                      setFormData({ ...formData, team_number: e.target.value })
                    }
                    placeholder="e.g., T001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="track">Track</Label>
                  <Select
                    value={formData.track_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, track_id: value, room_id: "" })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, room_id: value })
                    }
                    required
                    disabled={!formData.track_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="members">Team Members (comma-separated)</Label>
                <Input
                  id="members"
                  value={formData.members}
                  onChange={(e) =>
                    setFormData({ ...formData, members: e.target.value })
                  }
                  placeholder="e.g., John Doe, Jane Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Input
                  id="college"
                  value={formData.college}
                  onChange={(e) =>
                    setFormData({ ...formData, college: e.target.value })
                  }
                  placeholder="e.g., BNM Institute of Technology"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Team Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="e.g., team@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problem_statement">Problem Statement</Label>
                <Textarea
                  id="problem_statement"
                  value={formData.problem_statement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      problem_statement: e.target.value,
                    })
                  }
                  placeholder="Describe the problem statement here."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTeam ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="hover:shadow-md transition-shadow flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{team.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {team.team_number}
                  </div>
                </div>
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(team)}
                        >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(team.id)}
                        >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              </CardTitle>
              <div className="space-y-2 mt-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{team.tracks.name}</Badge>
                  <Badge variant="secondary">{team.rooms.name}</Badge>
                  {team.checked_in ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Checked In
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Checked In
                    </Badge>
                  )}
                </div>
                {team.college && (
                  <div className="text-xs text-muted-foreground pt-1">
                    {team.college}
                  </div>
                )}
                {team.email && (
                  <div className="text-xs text-muted-foreground pt-1">
                    📧 {team.email}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {team.problem_statement && (
                 <div className="mb-4">
                    <p className="text-sm font-semibold mb-1">Problem Statement</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {team.problem_statement}
                    </p>
                 </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                <span>{team.members?.length || 0} members</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-lg font-semibold">
                  Score: {Number(team.total_score).toFixed(1)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/team-checkin/${team.id}`, '_blank')}
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No teams yet. Create tracks and rooms first, then add teams.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminTeams;