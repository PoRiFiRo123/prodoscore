import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  name: string;
  track_id: string;
  is_locked: boolean;
  tracks: { name: string };
}

interface Track {
  id: string;
  name: string;
}

const AdminRooms = () => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", track_id: "" });

  useEffect(() => {
    fetchTracks();
    fetchRooms();
  }, []);

  const fetchTracks = async () => {
    const { data } = await supabase.from("tracks").select("id, name").order("name");
    setTracks(data || []);
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*, tracks(name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching rooms",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("rooms").insert([formData]);

    if (error) {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Room created",
        description: "New room has been created successfully.",
      });
      fetchRooms();
      setOpen(false);
      setFormData({ name: "", track_id: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    const { error } = await supabase.from("rooms").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting room",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Room deleted",
        description: "Room has been deleted successfully.",
      });
      fetchRooms();
    }
  };

  const toggleLock = async (id: string, isLocked: boolean) => {
    const { error } = await supabase
      .from("rooms")
      .update({ is_locked: !isLocked })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating room",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: isLocked ? "Room unlocked" : "Room locked",
        description: isLocked
          ? "Judges can now edit scores in this room."
          : "Judges can no longer edit scores in this room.",
      });
      fetchRooms();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Rooms</h2>
          <p className="text-muted-foreground">Manage evaluation rooms</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Room</DialogTitle>
              <DialogDescription>Add a new evaluation room</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="track">Track</Label>
                <Select
                  value={formData.track_id}
                  onValueChange={(value) => setFormData({ ...formData, track_id: value })}
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
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SW-101"
                  required
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
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {room.name}
                    {room.is_locked && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(room.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardTitle>
              <CardDescription>{room.tracks.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={room.is_locked ? "outline" : "secondary"}
                size="sm"
                className="w-full"
                onClick={() => toggleLock(room.id, room.is_locked)}
              >
                {room.is_locked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock Room
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Room
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No rooms yet. Create tracks first, then add rooms.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminRooms;
