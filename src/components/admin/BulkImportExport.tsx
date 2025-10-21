import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BulkImportExport() {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const generateSHA256 = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleImportTeams = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      const teams = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const team: any = {};
        headers.forEach((header, index) => {
          if (header === "members") {
            team[header] = values[index] ? values[index].split(";") : [];
          } else {
            team[header] = values[index] || null;
          }
        });
        return team;
      });

      const { error } = await supabase.from("teams").insert(teams);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${teams.length} teams successfully`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleExportTeams = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const { data: teams, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let content = "";
      let filename = "";
      let mimeType = "";

      if (format === "csv") {
        const headers = ["id", "name", "team_number", "college", "members", "room_id", "track_id"];
        const csv = [
          headers.join(","),
          ...teams.map((team) =>
            headers
              .map((h) => {
                if (h === "members") {
                  return Array.isArray(team[h]) ? team[h].join(";") : "";
                }
                return team[h] || "";
              })
              .join(",")
          ),
        ].join("\n");
        content = csv;
        filename = `teams_export_${Date.now()}.csv`;
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(teams, null, 2);
        filename = `teams_export_${Date.now()}.json`;
        mimeType = "application/json";
      }

      const hash = await generateSHA256(content);

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `SHA-256: ${hash.substring(0, 16)}...`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportScores = async () => {
    setExporting(true);
    try {
      const { data: scores, error } = await supabase
        .from("scores")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const content = JSON.stringify(scores, null, 2);
      const hash = await generateSHA256(content);

      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scores_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `SHA-256: ${hash.substring(0, 16)}...`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bulk Import / Export</h2>
        <p className="text-muted-foreground">Manage data in bulk with CSV and JSON support</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Teams
            </CardTitle>
            <CardDescription>Upload a CSV file to import teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleImportTeams}
                disabled={importing}
              />
              <p className="text-xs text-muted-foreground">
                CSV format: name, team_number, college, members (semicolon-separated), room_id, track_id
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Teams
            </CardTitle>
            <CardDescription>Download teams data with SHA-256 hash</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => handleExportTeams("csv")}
              disabled={exporting}
              className="w-full"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button
              onClick={() => handleExportTeams("json")}
              disabled={exporting}
              className="w-full"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Scores
            </CardTitle>
            <CardDescription>Download all scoring data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportScores}
              disabled={exporting}
              className="w-full"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Scores (JSON)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
