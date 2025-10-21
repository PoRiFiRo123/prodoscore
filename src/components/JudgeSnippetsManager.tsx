import React, { useState } from "react";
import { useSnippets, Snippet } from "@/hooks/useSnippets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTableView } from '@/components/ui/data-table-view'
import { useToast } from "@/hooks/use-toast"

const columns = [
    {
        accessorKey: "shortcut",
        header: "Shortcut",
    },
    {
        accessorKey: "full_text",
        header: "Full Text",
    },
];

export const JudgeSnippetsManager = () => {
  const { snippets, loading, insertSnippet, updateSnippet, deleteSnippet } = useSnippets();
  const [open, setOpen] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [fullText, setFullText] = useState("");
  const [editSnippetId, setEditSnippetId] = useState<string | null>(null);
  const [editFullText, setEditFullText] = useState("");
  const { toast } = useToast()

  const handleAddSnippet = async () => {
    if (shortcut && fullText) {
      const newSnippet = await insertSnippet(shortcut, fullText);
      if (newSnippet) {
        setShortcut("");
        setFullText("");
        setOpen(false);
      }
    } else {
      toast({
        title: "Error creating snippet",
        description: "Please fill all fields",
        variant: "destructive",
      })
    }
  };

  const handleUpdateSnippet = async () => {
    if (editSnippetId && editFullText) {
      const updated = await updateSnippet(editSnippetId, editFullText)
      if(updated){
        setEditSnippetId(null);
        setEditFullText("");
      }
    }
  };

  const handleDeleteSnippet = async (id: string) => {
    await deleteSnippet(id);
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Snippet</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Snippet</DialogTitle>
            <DialogDescription>
              Create a new snippet for quick comments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shortcut" className="text-right">
                Shortcut
              </Label>
              <Input
                type="text"
                id="shortcut"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullText" className="text-right">
                Full Text
              </Label>
              <Input
                type="text"
                id="fullText"
                value={fullText}
                onChange={(e) => setFullText(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddSnippet}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTableView
        columns={columns}
        data={snippets || []}
        loading={loading}
        onDelete={handleDeleteSnippet}
        onUpdate={(snippet:Snippet) => {
          setEditSnippetId(snippet.id)
          setEditFullText(snippet.full_text)
        }}
        getRowId={(row) => row.id}
      />
      {editSnippetId && (
        <Dialog open={!!editSnippetId} onOpenChange={() => setEditSnippetId(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Snippet</DialogTitle>
              <DialogDescription>
                Edit the full text of the snippet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fullText" className="text-right">
                  Full Text
                </Label>
                <Input
                  type="text"
                  id="fullText"
                  value={editFullText}
                  onChange={(e) => setEditFullText(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleUpdateSnippet}>
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
