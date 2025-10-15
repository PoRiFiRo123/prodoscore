import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Judge {
  id: string;
  email: string;
  full_name: string | null;
  assigned_rooms: { room_id: string; rooms: { name: string } }[];
}

interface Room {
  id: string;
  name: string;
  tracks: { name: string };
}

const AdminJudges = () => {
  const { toast } = useToast();
  const [judges, setJudges] = useState<Judge[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  useEffect(() => {
    fetchJudges();
    fetchRooms();
  }, []);

  const fetchJudges = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        user_roles!inner(role)
      `)
      .eq("user_roles.role", "judge");

    if (profiles) {
      const judgesWithRooms = await Promise.all(
        profiles.map(async (profile) => {
          const { data: assignments } = await supabase
            .from("judge_assignments")
            .select("room_id, rooms(name)")
            .eq("judge_id", profile.id);

          return {
            ...profile,
            assigned_rooms: assignments || [],
          };
        })
      );

      setJudges(judgesWithRooms);
    }
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, name, tracks(name)")
      .order("name");
    setRooms(data || []);
  };

  const handleCreateJudge = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Assign judge role
        const { error: roleError } = await supabase.from("user_roles").insert([
          {
            user_id: authData.user.id,
            role: "judge",
          },
        ]);

        if (roleError) throw roleError;

        toast({
          title: "Judge created",
          description: "New judge has been created successfully.",
        });

        fetchJudges();
        setOpen(false);
        setFormData({ email: "", password: "", full_name: "" });
      }
    } catch (error: any) {
      toast({
        title: "Error creating judge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignRoom = async () => {
    if (!selectedJudge || !selectedRoom) return;

    const { error } = await supabase.from("judge_assignments").insert([
      {
        judge_id: selectedJudge,
        room_id: selectedRoom,
      },
    ]);

    if (error) {
      toast({
        title: "Error assigning room",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Room assigned",
        description: "Judge has been assigned to the room successfully.",
      });
      fetchJudges();
      setAssignOpen(false);
      setSelectedJudge("");
      setSelectedRoom("");
    }
  };

  const handleRemoveAssignment = async (judgeId: string, roomId: string) => {
    const { error } = await supabase
      .from("judge_assignments")
      .delete()
      .eq("judge_id", judgeId)
      .eq("room_id", roomId);

    if (error) {
      toast({
        title: "Error removing assignment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Assignment removed",
        description: "Room assignment has been removed successfully.",
      });
      fetchJudges();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Judges</h2>
          <p className="text-muted-foreground">Manage judges and room assignments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Judge to Room</DialogTitle>
                <DialogDescription>Select a judge and room to create assignment</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Judge</Label>
                  <Select value={selectedJudge} onValueChange={setSelectedJudge}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a judge" />
                    </SelectTrigger>
                    <SelectContent>
                      {judges.map((judge) => (
                        <SelectItem key={judge.id} value={judge.id}>
                          {judge.full_name || judge.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} ({room.tracks.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAssignOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignRoom}>Assign</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Judge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Judge Account</DialogTitle>
                <DialogDescription>Add a new judge to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateJudge} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="judge-name">Full Name</Label>
                  <Input
                    id="judge-name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g., Dr. Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="judge-email">Email</Label>
                  <Input
                    id="judge-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="judge@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="judge-password">Password</Label>
                  <Input
                    id="judge-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {judges.map((judge) => (
          <Card key={judge.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{judge.full_name || "Unnamed Judge"}</CardTitle>
              <CardDescription>{judge.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">Assigned Rooms:</div>
                {judge.assigned_rooms.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {judge.assigned_rooms.map((assignment) => (
                      <Badge
                        key={assignment.room_id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveAssignment(judge.id, assignment.room_id)}
                      >
                        {assignment.rooms.name}
                        <Trash2 className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No rooms assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {judges.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No judges yet. Create one to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminJudges;
