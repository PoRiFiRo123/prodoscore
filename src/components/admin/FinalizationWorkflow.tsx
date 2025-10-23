import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { logAdminAction } from "@/lib/auditLog";

export default function FinalizationWorkflow() {
  const { toast } = useToast();
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [sealing, setSealing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: tracks } = useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*");
      if (error) throw error;
      return data;
    },
  });

  const calculateAndStoreTotalScoresForTrack = async (trackId: string) => {
    const { data: teamsInTrack, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("track_id", trackId);

    if (teamsError) throw teamsError;

    for (const team of teamsInTrack) {
      const { data: scoresData, error: scoresError } = await supabase
        .from("scores")
        .select("score")
        .eq("team_id", team.id);

      if (scoresError) throw scoresError;

      const totalScore = scoresData.reduce((sum, score) => sum + score.score, 0);

      const { error: updateError } = await supabase
        .from("teams")
        .update({ total_score: totalScore })
        .eq("id", team.id);

      if (updateError) throw updateError;
    }
  };

  const handleSealTrack = async () => {
    if (!selectedTrack) return;

    setSealing(true);
    try {
      const { data: oldRoomsData, error: fetchError } = await supabase
        .from("rooms")
        .select("id, is_locked")
        .eq("track_id", selectedTrack);

      if (fetchError) throw fetchError;

      const { data: updatedRooms, error } = await supabase
        .from("rooms")
        .update({ is_locked: true })
        .eq("track_id", selectedTrack)
        .select();

      if (error) throw error;

      toast({
        title: "Track Sealed",
        description: "All rooms in this track have been locked",
      });

      // Log action for each room that was updated
      if (oldRoomsData && updatedRooms) {
        updatedRooms.forEach(newRoom => {
          const oldRoom = oldRoomsData.find(oldR => oldR.id === newRoom.id);
          if (oldRoom && oldRoom.is_locked === false) { // Only log if the state actually changed to locked
            logAdminAction("ROOM_LOCKED_BY_TRACK_SEAL", "rooms", newRoom.id, { is_locked: false }, { is_locked: true });
          }
        });
      }

      logAdminAction("TRACK_SEALED", "tracks", selectedTrack, { track_id: selectedTrack, sealed: false }, { track_id: selectedTrack, sealed: true });

    } catch (error: any) {
      console.error("Seal error:", error);
      toast({
        title: "Sealing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSealing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTrack) return;

    setGenerating(true);
    try {
      // First, calculate and update total scores for all teams in the selected track
      await calculateAndStoreTotalScoresForTrack(selectedTrack);

      // Fetch teams and their scores
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("track_id", selectedTrack)
        .order("total_score", { ascending: false });

      if (teamsError) throw teamsError;

      const track = tracks?.find((t) => t.id === selectedTrack);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let yPosition = 750;

      // Title
      page.drawText(`${track?.name || "Track"} - Winners Report`, {
        x: 50,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 40;

      // Winners
      teams?.slice(0, 10).forEach((team, index) => {
        page.drawText(`${index + 1}. ${team.name}`, {
          x: 50,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Score: ${team.total_score || 0}`, {
          x: 400,
          y: yPosition,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        yPosition -= 30;
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `winners_${track?.name}_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Winners report has been downloaded",
      });
      logAdminAction("REPORT_GENERATED", "reports", selectedTrack, null, { track_id: selectedTrack, report_type: "winners" });

    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Finalization Workflow</h2>
        <p className="text-muted-foreground">Seal tracks and generate winner reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Track</CardTitle>
          <CardDescription>Choose a track to finalize</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger>
              <SelectValue placeholder="Select a track" />
            </SelectTrigger>
            <SelectContent>
              {tracks?.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-4">
            <Button
              onClick={handleSealTrack}
              disabled={!selectedTrack || sealing}
              className="flex-1"
            >
              <Lock className="h-4 w-4 mr-2" />
              Seal Track
            </Button>

            <Button
              onClick={handleGenerateReport}
              disabled={!selectedTrack || generating}
              variant="outline"
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}