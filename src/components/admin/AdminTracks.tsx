import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  name: string;
  description: string | null;
}

const AdminTracks = () => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching tracks",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTracks(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTrack) {
      const { error } = await supabase
        .from("tracks")
        .update(formData)
        .eq("id", editingTrack.id);

      if (error) {
        toast({
          title: "Error updating track",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Track updated",
          description: "Track has been updated successfully.",
        });
        fetchTracks();
        handleClose();
      }
    } else {
      const { error } = await supabase.from("tracks").insert([formData]);

      if (error) {
        toast({
          title: "Error creating track",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Track created",
          description: "New track has been created successfully.",
        });
        fetchTracks();
        handleClose();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this track?")) return;

    const { error } = await supabase.from("tracks").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting track",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Track deleted",
        description: "Track has been deleted successfully.",
      });
      fetchTracks();
    }
  };

  const handleEdit = (track: Track) => {
    setEditingTrack(track);
    setFormData({ name: track.name, description: track.description || "" });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTrack(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tracks</h2>
          <p className="text-muted-foreground">Manage evaluation tracks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTrack ? "Edit Track" : "Create Track"}</DialogTitle>
              <DialogDescription>
                {editingTrack ? "Update track details" : "Add a new evaluation track"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Track Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Software Development"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the track"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit">{editingTrack ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{track.name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(track)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(track.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
              {track.description && (
                <CardDescription>{track.description}</CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {tracks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No tracks yet. Create one to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminTracks;
