import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Award, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JudgeScoring from "@/components/judge/JudgeScoring";

interface Room {
  id: string;
  name: string;
  track_id: string;
}

const Judge = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    const savedRoom = sessionStorage.getItem("judge_room");
    const savedName = sessionStorage.getItem("judge_name");
    if (savedRoom && savedName) {
      setRoom(JSON.parse(savedRoom));
      setJudgeName(savedName);
    }
  }, []);

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, track_id")
        .eq("passcode", passcode)
        .single();

      if (error || !data) {
        toast({
          title: "Invalid passcode",
          description: "Please check the passcode and try again.",
          variant: "destructive",
        });
        return;
      }

      setRoom(data);
      setShowNameInput(true);
      sessionStorage.setItem("judge_room", JSON.stringify(data));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify passcode.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (judgeName.trim()) {
      sessionStorage.setItem("judge_name", judgeName);
      toast({
        title: "Welcome!",
        description: `Ready to evaluate teams, ${judgeName}`,
      });
    }
  };

  const handleExit = () => {
    sessionStorage.removeItem("judge_room");
    sessionStorage.removeItem("judge_name");
    setRoom(null);
    setJudgeName("");
    setPasscode("");
    setShowNameInput(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-md opacity-50" />
                <Trophy className="h-8 w-8 text-primary relative z-10" />
                <Award className="h-4 w-4 text-accent absolute -top-1 -right-1 z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Judge Panel
                </h1>
                <p className="text-xs text-muted-foreground">Team Evaluation System</p>
              </div>
            </div>
            {room && judgeName && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{judgeName}</p>
                  <p className="text-xs text-muted-foreground">{room.name}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExit}>
                  Exit
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!room || !judgeName ? (
          <div className="max-w-md mx-auto mt-20">
            <Card className="border-2 shadow-xl">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-2">
                  <Lock className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Access Room</CardTitle>
                <CardDescription>
                  {!showNameInput ? "Enter the room passcode to continue" : "Enter your name to start evaluating"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showNameInput ? (
                  <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="passcode">Room Passcode</Label>
                      <Input
                        id="passcode"
                        type="text"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter passcode"
                        required
                        className="text-center text-lg tracking-wider"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Verifying..." : "Continue"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleNameSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="judgeName">Your Name</Label>
                      <Input
                        id="judgeName"
                        type="text"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Start Evaluating
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <JudgeScoring roomId={room.id} judgeName={judgeName} />
        )}
      </main>
    </div>
  );
};

export default Judge;
