import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Track {
  id: string;
  name: string;
  description: string | null;
}

interface Criterion {
  id: string;
  track_id: string;
  name: string;
  max_score: number;
  type: 'text' | 'dropdown';
  options: { label: string; score: number }[] | null;
}

const AdminTracks = () => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [criteriaDialogOpen, setCriteriaDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [criterionForm, setCriterionForm] = useState({
    name: "",
    max_score: 10,
    type: "text" as "text" | "dropdown",
    options: [{ label: "", score: 0 }]
  });

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

  const openCriteriaDialog = async (track: Track) => {
    setSelectedTrack(track);
    setCriteriaDialogOpen(true);
    
    const { data } = await supabase
      .from("criteria")
      .select("*")
      .eq("track_id", track.id)
      .order("display_order");
    
    setCriteria((data as any) || []);
  };

  const handleAddCriterion = async () => {
    if (!selectedTrack || !criterionForm.name) return;

    const { error } = await supabase.from("criteria").insert([{
      track_id: selectedTrack.id,
      name: criterionForm.name,
      max_score: criterionForm.max_score,
      type: criterionForm.type,
      options: criterionForm.type === "dropdown" ? criterionForm.options : null,
      display_order: criteria.length
    }]);

    if (error) {
      toast({
        title: "Error adding question",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Question added successfully" });
      setCriterionForm({
        name: "",
        max_score: 10,
        type: "text",
        options: [{ label: "", score: 0 }]
      });
      openCriteriaDialog(selectedTrack);
    }
  };

  const handleDeleteCriterion = async (id: string) => {
    const { error } = await supabase.from("criteria").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting question",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Question deleted successfully" });
      if (selectedTrack) openCriteriaDialog(selectedTrack);
    }
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
                    onClick={() => openCriteriaDialog(track)}
                    title="Manage Questions"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
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

      <Dialog open={criteriaDialogOpen} onOpenChange={setCriteriaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Questions for {selectedTrack?.name}</DialogTitle>
            <DialogDescription>Add scoring questions for judges</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Question Text</Label>
              <Input
                value={criterionForm.name}
                onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })}
                placeholder="e.g., Innovation and Creativity"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={criterionForm.type}
                  onValueChange={(value: "text" | "dropdown") =>
                    setCriterionForm({ ...criterionForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (Manual Entry)</SelectItem>
                    <SelectItem value="dropdown">Dropdown (Predefined Options)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {criterionForm.type === "text" && (
                <div className="space-y-2">
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    value={criterionForm.max_score}
                    onChange={(e) => setCriterionForm({ ...criterionForm, max_score: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>

            {criterionForm.type === "dropdown" && (
              <div className="space-y-2">
                <Label>Dropdown Options</Label>
                {criterionForm.options.map((option, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Option label"
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...criterionForm.options];
                        newOptions[idx].label = e.target.value;
                        setCriterionForm({ ...criterionForm, options: newOptions });
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Score"
                      className="w-24"
                      value={option.score}
                      onChange={(e) => {
                        const newOptions = [...criterionForm.options];
                        newOptions[idx].score = Number(e.target.value);
                        setCriterionForm({ ...criterionForm, options: newOptions });
                      }}
                    />
                    {idx > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newOptions = criterionForm.options.filter((_, i) => i !== idx);
                          setCriterionForm({ ...criterionForm, options: newOptions });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCriterionForm({
                      ...criterionForm,
                      options: [...criterionForm.options, { label: "", score: 0 }]
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Option
                </Button>
              </div>
            )}

            <Button onClick={handleAddCriterion} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Existing Questions</h3>
              {criteria.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions added yet</p>
              ) : (
                <div className="space-y-2">
                  {criteria.map((criterion) => (
                    <div key={criterion.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{criterion.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {criterion.type === "text"
                            ? `Manual entry (Max: ${criterion.max_score})`
                            : `Dropdown (${criterion.options?.length || 0} options)`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCriterion(criterion.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
