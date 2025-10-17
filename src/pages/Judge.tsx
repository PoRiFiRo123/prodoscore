import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Award, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JudgeScoring from "@/components/judge/JudgeScoring";

interface Room {
  id: string;
  name: string;
  track_id: string;
}

interface Judge {
  id: string;
  full_name: string;
}

interface Team {
  id: string;
  name: string;
  team_number: string;
  members: string[] | null;
  college: string | null;
  problem_statement: string | null;
}

const Judge = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [judgeName, setJudgeName] = useState("");
  const [judgeId, setJudgeId] = useState<string | null>(null); // New state for judgeId
  const [room, setRoom] = useState<Room | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null); // New state for selected team

  useEffect(() => {
    const savedRoom = sessionStorage.getItem("judge_room");
    const savedName = sessionStorage.getItem("judge_name");
    const savedJudgeId = sessionStorage.getItem("judge_id"); // Retrieve judgeId

    if (savedRoom && savedName && savedJudgeId) {
      setRoom(JSON.parse(savedRoom));
      setJudgeName(savedName);
      setJudgeId(savedJudgeId);
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

      const { data: judgeAssignments, error: assignmentsError } =
        await supabase
          .from("judge_assignments")
          .select("profiles(id, full_name)")
          .eq("room_id", data.id);

      if (assignmentsError) {
        toast({
          title: "Error fetching judges",
          description: "Could not fetch judges for this room.",
          variant: "destructive",
        });
        return;
      }

      if (judgeAssignments) {
        const fetchedJudges = judgeAssignments
          .map((j: any) => j.profiles)
          .filter((p) => p);
        if (fetchedJudges.length > 0) {
          setJudges(fetchedJudges);
          setRoom(data);
          setShowNameInput(true);
          sessionStorage.setItem("judge_room", JSON.stringify(data));
        } else {
          toast({
            title: "No Judges Assigned",
            description: "There are no judges assigned to this room.",
            variant: "destructive",
          });
        }
      }
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
      const selectedJudge = judges.find(judge => judge.full_name === judgeName);
      if (selectedJudge) {
        setJudgeId(selectedJudge.id);
        sessionStorage.setItem("judge_name", judgeName);
        sessionStorage.setItem("judge_id", selectedJudge.id); // Save judgeId
        toast({
          title: "Welcome!",
          description: `Ready to evaluate teams, ${judgeName}`,
        });
      } else {
        toast({
          title: "Judge Not Found",
          description: "Please select a valid judge name.",
          variant: "destructive",
        });
      }
    }
  };

  const handleExit = () => {
    sessionStorage.removeItem("judge_room");
    sessionStorage.removeItem("judge_name");
    sessionStorage.removeItem("judge_id"); // Remove judgeId from session storage
    setRoom(null);
    setJudgeName("");
    setJudgeId(null);
    setPasscode("");
    setShowNameInput(false);
    setSelectedTeam(null); // Reset selected team on exit
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-md opacity-50" />
                <Trophy className="h-8 w-8 text-primary relative z-10" />
                <Award
                  className="h-4 w-4 text-accent absolute -top-1 -right-1 z-10"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Judge Panel
                </h1>
                <p className="text-xs text-muted-foreground">
                  Team Evaluation System
                </p>
              </div>
            </button>
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
      <main className="container mx-auto px-4 py-8 pb-20 min-h-[calc(100vh-180px)]">
        {!room || !judgeName || !judgeId ? (
          <div className="max-w-md mx-auto mt-20">
            <Card className="border-2 shadow-xl">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-2">
                  <Lock className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Access Room</CardTitle>
                <CardDescription>
                  {!showNameInput
                    ? "Enter the room passcode to continue"
                    : "Enter your name to start evaluating"}
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Continue"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleNameSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="judgeName">Your Name</Label>
                      <Select
                        onValueChange={(value) => setJudgeName(value)}
                        value={judgeName}
                      >
                        <SelectTrigger className="bg-popover">
                          <SelectValue placeholder="Select your name" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {judges.map((judge) => (
                            <SelectItem
                              key={judge.id}
                              value={judge.full_name}
                            >
                              {judge.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!judgeName}
                    >
                      Start Evaluating
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <JudgeScoring
            roomId={room.id}
            judgeName={judgeName}
            judgeId={judgeId}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <img src="/bnmit.svg" alt="BNMIT Logo" className="h-12 w-auto" />
                <div>
                  <p className="text-sm font-semibold text-foreground">BNM Institute of Technology</p>
                  <p className="text-xs text-muted-foreground">Academic Excellence</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="EMC Logo" className="h-12 w-12" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Event Management Committee</p>
                  <p className="text-xs text-muted-foreground">Prodathon Organizers</p>
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-muted-foreground">
                Developed by <span className="font-semibold text-foreground">Nishit R Kirani</span>
              </p>
              <div className="flex items-center justify-center md:justify-end">
                <img src="/bnmit.svg" alt="BNMIT Logo" className="h-6 w-auto mr-2" />
                <p className="text-xs text-muted-foreground">© 2025</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Judge;
