import React, { useState, useEffect } from "react";
import { useSnippets, Snippet } from "@/hooks/useSnippets";
import { DataTableView } from "@/components/ui/data-table-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const columns = [
  { accessorKey: "shortcut", header: "Shortcut" },
  { accessorKey: "full_text", header: "Full Text" },
  { accessorKey: "track_id", header: "Track ID" },
];

interface Track {
  id: string;
  name: string;
}

export const AdminSnippetsManager = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const { snippets, loading, insertSnippet } = useSnippets(selectedTrackId);
  const [shortcut, setShortcut] = useState("");
  const [fullText, setFullText] = useState("");

  useEffect(() => {
    const fetchTracks = async () => {
      const { data, error } = await supabase.from("tracks").select("id, name");
      if (data) {
        setTracks(data);
      }
    };
    fetchTracks();
  }, []);

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTrackId && shortcut && fullText) {
      await insertSnippet(shortcut, fullText);
      setShortcut("");
      setFullText("");
    }
  };

  return (
    <div>
      <div className="mb-4 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Manage Snippets for a Track</h3>
        <div className="mb-4">
            <Label htmlFor="track">Track</Label>
            <Select onValueChange={setSelectedTrackId} value={selectedTrackId || undefined}>
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
      <DataTableView
        columns={columns}
        data={snippets || []}
        loading={loading}
        getRowId={(row: Snippet) => row.id}
      />
    </div>
  );
};
