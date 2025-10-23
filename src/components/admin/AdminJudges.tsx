import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, UserPlus, Edit, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Judge {
  id: string;
  email: string | null;
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
  const [createJudgeDialogOpen, setCreateJudgeDialogOpen] = useState(false);
  const [assignRoomDialogOpen, setAssignRoomDialogOpen] = useState(false);
  const [editJudgeDialogOpen, setEditJudgeDialogOpen] = useState(false);
  const [deleteJudgeDialogOpen, setDeleteJudgeDialogOpen] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [newJudgeFullName, setNewJudgeFullName] = useState("");
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [deletingJudge, setDeletingJudge] = useState<Judge | null>(null);

  useEffect(() => {
    fetchJudges();
    fetchRooms();
  }, []);

  const fetchJudges = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          user_roles!inner(role)
        `)
        .eq("user_roles.role", "judge");

      if (profilesError) {
        throw profilesError;
      }

      if (profiles) {
        const judgesWithRooms = await Promise.all(
          profiles.map(async (profile) => {
            const { data: assignments, error: assignmentsError } = await supabase
              .from("judge_assignments")
              .select("room_id, rooms(name)")
              .eq("judge_id", profile.id);

            if (assignmentsError) {
              // Log or handle individual assignment fetch errors if necessary
              console.error(`Error fetching assignments for judge ${profile.id}:`, assignmentsError);
            }

            return {
              ...profile,
              assigned_rooms: assignments || [],
            };
          })
        );

        setJudges(judgesWithRooms);
      }
    } catch (error: any) {
      console.error("Error fetching judges:", error);
      toast({
        title: "Error loading judges",
        description: error.message || "Failed to load judge data. Please check RLS policies or network connection.",
        variant: "destructive",
      });
    }
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, tracks(name)")
      .order("name");
    
    if (error) {
      console.error("Error fetching rooms:", error);
      toast({
        title: "Error loading rooms",
        description: error.message || "Failed to load room data.",
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
    }
  };

  const handleCreateJudge = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('https://xrlzqtdhzgnjvmdycljs.supabase.co/functions/v1/create-judge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ fullName: newJudgeFullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create judge');
      }

      toast({
        title: "Judge created",
        description: data.message || "New judge has been created successfully.",
      });

      if (data.judgeId) {
        logAdminAction("JUDGE_CREATED", "judges", data.judgeId, null, { id: data.judgeId, full_name: newJudgeFullName });
      }

      fetchJudges();
      setCreateJudgeDialogOpen(false);
      setNewJudgeFullName("");
    } catch (error: any) {
      toast({
        title: "Error creating judge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJudge) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const oldJudgeData = { ...editingJudge };

      const response = await fetch('https://xrlzqtdhzgnjvmdycljs.supabase.co/functions/v1/update-judge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ judgeId: editingJudge.id, fullName: editingJudge.full_name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update judge');
      }

      toast({
        title: "Judge updated",
        description: data.message || "Judge's full name has been updated successfully.",
      });
      logAdminAction("JUDGE_UPDATED", "profiles", editingJudge.id, oldJudgeData, data.judge);
      fetchJudges();
      setEditJudgeDialogOpen(false);
      setEditingJudge(null);
    } catch (error: any) {
      toast({
        title: "Error updating judge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteJudge = async () => {
    if (!deletingJudge) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const oldJudgeData = { ...deletingJudge };

      const response = await fetch('https://xrlzqtdhzgnjvmdycljs.supabase.co/functions/v1/delete-judge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ judgeId: deletingJudge.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete judge');
      }

      toast({
        title: "Judge deleted",
        description: data.message || "Judge and all associated assignments have been removed.",
      });
      logAdminAction("JUDGE_DELETED", "profiles", deletingJudge.id, oldJudgeData, null);
      fetchJudges();
      setDeleteJudgeDialogOpen(false);
      setDeletingJudge(null);
    } catch (error: any) {
      toast({
        title: "Error deleting judge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignRoom = async () => {
    if (!selectedJudge || !selectedRoom) return;

    const { data: existingAssignment } = await supabase
        .from("judge_assignments")
        .select("*")
        .eq("judge_id", selectedJudge)
        .eq("room_id", selectedRoom)
        .single();
    
    if (existingAssignment) {
        toast({
            title: "Assignment exists",
            description: "This judge is already assigned to this room.",
            variant: "default",
        });
        return;
    }

    const { data, error } = await supabase.from("judge_assignments").insert([
      {
        judge_id: selectedJudge,
        room_id: selectedRoom,
      },
    ]).select().single();

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
      logAdminAction("JUDGE_ROOM_ASSIGNED", "judge_assignments", data.id, null, data);
      fetchJudges();
      setAssignRoomDialogOpen(false);
      setSelectedJudge("");
      setSelectedRoom("");
    }
  };

  const handleRemoveAssignment = async (judgeId: string, roomId: string) => {
    const { data: oldAssignmentData } = await supabase
      .from("judge_assignments")
      .select("*")
      .eq("judge_id", judgeId)
      .eq("room_id", roomId)
      .single();

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
      logAdminAction("JUDGE_ROOM_UNASSIGNED", "judge_assignments", oldAssignmentData.id, oldAssignmentData, null);
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
          <Dialog open={assignRoomDialogOpen} onOpenChange={setAssignRoomDialogOpen}>
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
                  <Button variant="outline" onClick={() => setAssignRoomDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignRoom}>Assign</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createJudgeDialogOpen} onOpenChange={setCreateJudgeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Judge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Judge Account</DialogTitle>
                <DialogDescription>Add a new judge to the system by name</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateJudge} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="judge-name">Full Name</Label>
                  <Input
                    id="judge-name"
                    value={newJudgeFullName}
                    onChange={(e) => setNewJudgeFullName(e.target.value)}
                    placeholder="e.g., Dr. Smith"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateJudgeDialogOpen(false)}>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-0.5">
                <CardTitle className="text-lg">{judge.full_name || "Unnamed Judge"}</CardTitle>
                <CardDescription>{judge.email || "No Email Provided"}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingJudge(judge);
                      setEditJudgeDialogOpen(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDeletingJudge(judge);
                      setDeleteJudgeDialogOpen(true);
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Edit Judge Dialog */}
      <Dialog open={editJudgeDialogOpen} onOpenChange={setEditJudgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Judge</DialogTitle>
            <DialogDescription>Update the full name of the judge.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateJudge} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-judge-name">Full Name</Label>
              <Input
                id="edit-judge-name"
                value={editingJudge?.full_name || ""}
                onChange={(e) => setEditingJudge(editingJudge ? { ...editingJudge, full_name: e.target.value } : null)}
                placeholder="e.g., Dr. Smith"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditJudgeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Judge Dialog */}
      <Dialog open={deleteJudgeDialogOpen} onOpenChange={setDeleteJudgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the judge &quot;{deletingJudge?.full_name || deletingJudge?.email}&quot;
              and remove their data from our servers, including all associated room assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteJudgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteJudge}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJudges;
