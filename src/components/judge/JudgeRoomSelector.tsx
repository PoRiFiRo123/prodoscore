import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DoorOpen, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: string;
  name: string;
  is_locked: boolean;
  tracks: { name: string };
  team_count: number;
}

interface JudgeRoomSelectorProps {
  onRoomSelect: (roomId: string) => void;
}

const JudgeRoomSelector = ({ onRoomSelect }: JudgeRoomSelectorProps) => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedRooms();
  }, []);

  const fetchAssignedRooms = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: assignments } = await supabase
      .from("judge_assignments")
      .select("room_id")
      .eq("judge_id", session.user.id);

    if (assignments && assignments.length > 0) {
      const roomIds = assignments.map((a) => a.room_id);
      
      const { data: roomsData, error } = await supabase
        .from("rooms")
        .select("id, name, is_locked, tracks(name)")
        .in("id", roomIds);

      if (error) {
        toast({
          title: "Error fetching rooms",
          description: error.message,
          variant: "destructive",
        });
      } else if (roomsData) {
        // Get team counts for each room
        const roomsWithCounts = await Promise.all(
          roomsData.map(async (room) => {
            const { count } = await supabase
              .from("teams")
              .select("*", { count: "exact", head: true })
              .eq("room_id", room.id);

            return {
              ...room,
              team_count: count || 0,
            };
          })
        );

        setRooms(roomsWithCounts);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading rooms...</p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Rooms Assigned</h3>
          <p className="text-muted-foreground">
            You haven't been assigned to any rooms yet. Please contact the administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Select a Room</h2>
        <p className="text-muted-foreground">Choose a room to start evaluating teams</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => !room.is_locked && onRoomSelect(room.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                {room.name}
              </CardTitle>
              <CardDescription>{room.tracks.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {room.team_count} teams
                </div>
                {room.is_locked ? (
                  <span className="text-xs text-destructive">Locked</span>
                ) : (
                  <Button size="sm">Select</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JudgeRoomSelector;
