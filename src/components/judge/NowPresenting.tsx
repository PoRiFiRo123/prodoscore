import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Presentation, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PresentingTeam {
  team_id: string;
  team_name: string;
  started_at: string;
}

export default function NowPresenting({ roomId }: { roomId: string }) {
  const { toast } = useToast();
  const [presentingTeam, setPresentingTeam] = useState<PresentingTeam | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (!roomId) return;

    const fetchPresentingTeam = async () => {
      try {
        // Check if room is active (not locked)
        const { data: room } = await supabase
          .from("rooms")
          .select("is_locked")
          .eq("id", roomId)
          .single();

        if (room?.is_locked) {
          setPresentingTeam(null);
          return;
        }

        // Try to fetch from Storage
        const { data, error } = await supabase.storage
          .from("now_presenting")
          .download(`room_${roomId}.json`);

        if (error) {
          // File doesn't exist yet
          setPresentingTeam(null);
          return;
        }

        const text = await data.text();
        const teamData = JSON.parse(text);
        setPresentingTeam(teamData);
      } catch (error) {
        console.error("Error fetching presenting team:", error);
      }
    };

    fetchPresentingTeam();

    // Poll every 5 seconds
    const interval = setInterval(fetchPresentingTeam, 5000);

    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (!presentingTeam) {
      setElapsedTime(0);
      return;
    }

    const startTime = new Date(presentingTeam.started_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [presentingTeam]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!presentingTeam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Now Presenting
          </CardTitle>
          <CardDescription>No team is currently presenting</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          Now Presenting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Team</p>
              <p className="text-xl font-bold">{presentingTeam.team_name}</p>
            </div>
          </div>

          <Badge variant="default" className="text-lg px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(elapsedTime)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
