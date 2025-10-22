import React, { useState, useEffect, useMemo } from "react";
import { useSnippets, Snippet } from "@/hooks/useSnippets";
import { DataTableView } from "@/components/ui/data-table-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Track {
  id: string;
  name: string;
}

export const AdminSnippetsManager = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const { snippets, loading, insertSnippet, updateSnippet, deleteSnippet } = useSnippets(selectedTrackId);
  const [shortcut, setShortcut] = useState("");
  const [fullText, setFullText] = useState("");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [editedFullText, setEditedFullText] = useState("");

  useEffect(() => {
    const fetchTracks = async () => {
      const { data, error } = await supabase.from("tracks").select("id, name");
      if (data) {
        setTracks(data);
      }
    };
    fetchTracks();
  }, []);

  const trackNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const track of tracks) {
      map.set(track.id, track.name);
    }
    return map;
  }, [tracks]);

  const displaySnippets = useMemo(() => {
    return snippets.map((snippet) => ({
      ...snippet,
      track_name: trackNameMap.get(snippet.track_id) || snippet.track_id,
    }));
  }, [snippets, trackNameMap]);

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTrackId && shortcut && fullText) {
      await insertSnippet(shortcut, fullText);
      setShortcut("");
      setFullText("");
    }
  };

  const handleEdit = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setEditedFullText(snippet.full_text);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setIsDeleteDialogOpen(true);
  };

  const confirmEdit = async () => {
    if (selectedSnippet && editedFullText) {
      await updateSnippet(selectedSnippet.id, editedFullText);
      setIsEditDialogOpen(false);
      setSelectedSnippet(null);
    }
  };

  const confirmDelete = async () => {
    if (selectedSnippet) {
      await deleteSnippet(selectedSnippet.id);
      setIsDeleteDialogOpen(false);
      setSelectedSnippet(null);
    }
  };

  const columns = [
    { accessorKey: "shortcut", header: "Shortcut" },
    { accessorKey: "full_text", header: "Full Text" },
    { accessorKey: "track_name", header: "Track" },
  ];

  return (
    <div>
      {/* Add/Manage Snippets Form */}
      <div className="mb-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Manage Snippets for a Track</h3>
        <div className="mb-4">
          <Label htmlFor="track">Track</Label>
          <Select onValueChange={setSelectedTrackId} value={selectedTrackId || ''}>
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

        {selectedTrackId && (
          <form onSubmit={handleAddSnippet} className="space-y-4">
            <div>
              <Label htmlFor="shortcut">Shortcut</Label>
              <Input
                id="shortcut"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="e.g., /intro"
              />
            </div>
            <div>
              <Label htmlFor="full_text">Full Text</Label>
              <Input
                id="full_text"
                value={fullText}
                onChange={(e) => setFullText(e.target.value)}
                placeholder="The full text of the snippet"
              />
            </div>
            <Button type="submit">Add Snippet</Button>
          </form>
        )}
      </div>

      {/* Snippets Table */}
      <DataTableView
        columns={columns}
        data={displaySnippets || []}
        loading={loading}
        getRowId={(row: Snippet) => row.id}
        onUpdate={handleEdit}
        onDelete={handleDelete}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Snippet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edited_full_text">Full Text</Label>
              <Input
                id="edited_full_text"
                value={editedFullText}
                onChange={(e) => setEditedFullText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Snippet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this snippet? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
