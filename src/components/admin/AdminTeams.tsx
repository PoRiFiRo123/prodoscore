import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
  team_number: string;
  members: string[] | null;
  college: string | null;
  total_score: number;
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
  const [formData, setFormData] = useState({
    name: "",
    team_number: "",
    track_id: "",
    room_id: "",
    members: "",
    college: "",
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
      setTeams(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const membersArray = formData.members
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m);

    const { error } = await supabase.from("teams").insert([
      {
        name: formData.name,
        team_number: formData.team_number,
        track_id: formData.track_id,
        room_id: formData.room_id,
        members: membersArray,
        college: formData.college || null,
      },
    ]);

    if (error) {
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Team created",
        description: "New team has been created successfully.",
      });
      fetchTeams();
      setOpen(false);
      setFormData({
        name: "",
        team_number: "",
        track_id: "",
        room_id: "",
        members: "",
        college: "",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
              <DialogDescription>Add a new participating team</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onValueChange={(value) => setFormData({ ...formData, room_id: value })}
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
                  onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                  placeholder="e.g., John Doe, Jane Smith, Bob Johnson"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="college">College (optional)</Label>
                <Input
                  id="college"
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="e.g., BNMIT"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{team.name}</div>
                  <div className="text-sm text-muted-foreground">{team.team_number}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardTitle>
              <CardDescription className="space-y-2">
                <div className="flex gap-2">
                  <Badge variant="outline">{team.tracks.name}</Badge>
                  <Badge variant="secondary">{team.rooms.name}</Badge>
                </div>
                {team.college && (
                  <div className="text-xs text-muted-foreground">{team.college}</div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                {team.members?.length || 0} members
              </div>
              <div className="mt-2 text-lg font-semibold">
                Score: {Number(team.total_score).toFixed(1)}
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
