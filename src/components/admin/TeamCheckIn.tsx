import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  CheckCircle,
  XCircle,
  Camera,
  CameraOff,
  Users,
  Filter,
  Search,
  Download,
  Keyboard,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Team {
  id: string;
  name: string;
  team_number: string;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  tracks: { name: string };
  rooms: { name: string };
}

export default function TeamCheckIn() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTeamQR, setSelectedTeamQR] = useState<Team | null>(null);
  const [manualQRCode, setManualQRCode] = useState("");
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");

  useEffect(() => {
    fetchUserAndTeams();
    fetchTracks();
    fetchRooms();

    // Subscribe to team updates
    const channel = supabase
      .channel("team-checkin-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
        },
        () => {
          fetchUserAndTeams();
        }
      )
      .subscribe();

    return () => {
      cleanupScanner();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teams, selectedTrack, selectedRoom, filterStatus, searchQuery]);

  const cleanupScanner = async () => {
    if (html5QrCode && scanning) {
      try {
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (err) {
        console.error("Error cleaning up scanner:", err);
      }
    }
  };

  const fetchUserAndTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
    fetchTeams();
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*, tracks(name), rooms(name)")
      .order("team_number");

    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }

    setTeams(data as Team[]);
  };

  const fetchTracks = async () => {
    const { data } = await supabase.from("tracks").select("id, name").order("name");
    setTracks(data || []);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("id, name").order("name");
    setRooms(data || []);
  };

  const applyFilters = () => {
    let filtered = [...teams];

    if (selectedTrack !== "all") {
      filtered = filtered.filter((team) => team.tracks.name === selectedTrack);
    }

    if (selectedRoom !== "all") {
      filtered = filtered.filter((team) => team.rooms.name === selectedRoom);
    }

    if (filterStatus === "checked-in") {
      filtered = filtered.filter((team) => team.checked_in);
    } else if (filterStatus === "not-checked-in") {
      filtered = filtered.filter((team) => !team.checked_in);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.name.toLowerCase().includes(query) ||
          team.team_number.toLowerCase().includes(query)
      );
    }

    setFilteredTeams(filtered);
  };

  const startScanning = async () => {
    setCameraError("");
    setScanning(true);

    try {
      // Clean up any existing scanner instance
      if (html5QrCode) {
        try {
          const state = html5QrCode.getState();
          if (state === 2) { // Scanner is running
            await html5QrCode.stop();
          }
          html5QrCode.clear();
        } catch (e) {
          console.log("Scanner cleanup:", e);
        }
      }

      // Create new scanner instance
      const scanner = new Html5Qrcode("qr-reader", {
        verbose: false,
        formatsToSupport: [0], // QR_CODE only
      });

      setHtml5QrCode(scanner);

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        throw new Error("No cameras found. Please check permissions.");
      }

      console.log("Available cameras:", devices.length);

      // Prefer back/environment camera for better QR scanning
      let selectedCamera = devices[0];
      for (const device of devices) {
        if (device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment')) {
          selectedCamera = device;
          break;
        }
      }

      console.log("Using camera:", selectedCamera.label);

      // Start scanning with optimized settings
      await scanner.start(
        selectedCamera.id,
        {
          fps: 10, // Scan 10 times per second
          qrbox: { width: 300, height: 300 }, // Larger scan box
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          console.log("✅ QR Code detected:", decodedText);
          
          // Temporarily pause scanning to prevent multiple scans
          try {
            await scanner.pause(true);
          } catch (e) {
            console.log("Pause error:", e);
          }

          // Process the check-in
          await handleCheckIn(decodedText);
          
          // Resume scanning after a delay
          setTimeout(async () => {
            try {
              if (scanner.getState() === 3) { // Paused state
                scanner.resume();
              }
            } catch (e) {
              console.log("Resume error:", e);
            }
          }, 2000);
        },
        (errorMessage) => {
          // Silently ignore scanning errors (they're too frequent)
        }
      );

      toast({
        title: "✅ Scanner Ready",
        description: "Point camera at team QR code to check in",
      });

    } catch (err: any) {
      console.error("❌ Scanner error:", err);
      setScanning(false);
      
      const errorMsg = err.message || "Failed to start camera";
      setCameraError(errorMsg);
      
      toast({
        title: "Camera Access Failed",
        description: "Please allow camera permissions or use manual input below.",
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    console.log("🛑 Stopping scanner...");
    
    if (html5QrCode) {
      try {
        const state = html5QrCode.getState();
        if (state === 2 || state === 3) { // Running or Paused
          await html5QrCode.stop();
        }
        html5QrCode.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    
    setScanning(false);
    setHtml5QrCode(null);
    setCameraError("");
    
    toast({
      title: "Scanner Stopped",
      description: "Camera has been released",
    });
  };

  const handleCheckIn = async (qrToken: string) => {
    console.log("🔄 Processing check-in for token:", qrToken);
    
    if (!userId) {
      toast({
        title: "❌ Authentication Error",
        description: "You must be logged in to check in teams",
        variant: "destructive",
      });
      return;
    }

    try {
      const trimmedToken = qrToken.trim();
      
      // Validate token format (should be a UUID)
      if (!trimmedToken || trimmedToken.length < 10) {
        toast({
          title: "❌ Invalid QR Code",
          description: "The scanned code is not valid",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.rpc("check_in_team", {
        _qr_token: trimmedToken,
        _admin_id: userId,
      });

      if (error) {
        console.error("RPC error:", error);
        throw error;
      }

      const result = data[0];

      if (result.success) {
        // Play success sound or vibration if available
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        
        toast({
          title: "✅ Check-in Successful!",
          description: `${result.team_name} has been checked in`,
          duration: 3000,
        });
        
        // Refresh team list
        fetchTeams();

        // Clear manual input if it was used
        if (scanMode === "manual") {
          setManualQRCode("");
        }
      } else {
        toast({
          title: "⚠️ Check-in Failed",
          description: result.message || "Team could not be checked in",
          variant: "destructive",
          duration: 4000,
        });
      }
    } catch (err: any) {
      console.error("❌ Check-in error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to check in team. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleManualCheckIn = () => {
    if (!manualQRCode.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a QR code",
        variant: "destructive",
      });
      return;
    }
    handleCheckIn(manualQRCode);
  };

  const handleManualToggle = async (teamId: string, currentStatus: boolean) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.rpc("toggle_team_checkin", {
        _team_id: teamId,
        _admin_id: userId,
        _checked_in: !currentStatus,
      });

      if (error) throw error;

      if (data) {
        toast({
          title: currentStatus ? "Check-in Removed" : "Checked In",
          description: currentStatus
            ? "Team check-in status has been cleared"
            : "Team has been manually checked in",
        });
        fetchTeams();
      }
    } catch (err: any) {
      console.error("Toggle error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update check-in status",
        variant: "destructive",
      });
    }
  };

  const exportCheckinList = () => {
    const csv = [
      ["Team Number", "Team Name", "Track", "Room", "Checked In", "Checked In At"].join(","),
      ...filteredTeams.map((team) =>
        [
          team.team_number,
          `"${team.name}"`,
          `"${team.tracks.name}"`,
          `"${team.rooms.name}"`,
          team.checked_in ? "Yes" : "No",
          team.checked_in_at ? `"${new Date(team.checked_in_at).toLocaleString()}"` : "N/A",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Check-in list has been exported",
    });
  };

  const checkedInCount = teams.filter((t) => t.checked_in).length;
  const totalCount = teams.length;
  const percentageCheckedIn = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Team Check-in</h2>
        <p className="text-sm md:text-base text-muted-foreground">Scan QR codes or manually check in teams</p>
      </div>

      {/* Statistics Cards - Mobile Optimized */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Teams</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Total</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-600">{checkedInCount}</div>
            <p className="text-xs text-muted-foreground hidden md:block">Done</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Rate</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{percentageCheckedIn}%</div>
            <p className="text-xs text-muted-foreground hidden md:block">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Card - Mobile Optimized */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <QrCode className="h-4 w-4 md:h-5 md:w-5" />
            Check-in Scanner
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Use camera to scan QR codes or enter manually</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <Tabs value={scanMode} onValueChange={(v) => {
            setScanMode(v as "camera" | "manual");
            if (v === "manual" && scanning) {
              stopScanning();
            }
          }}>
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="camera" className="text-xs md:text-sm py-2">
                <Camera className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="manual" className="text-xs md:text-sm py-2">
                <Keyboard className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="space-y-4">
              {!scanning && !cameraError && (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Ready to Scan</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Click the button below to activate your camera and scan team QR codes for instant check-in
                    </p>
                  </div>
                </div>
              )}

              <div
                id="qr-reader"
                className={`${scanning ? "border-4 border-primary rounded-lg overflow-hidden shadow-lg" : "hidden"}`}
                style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}
              />

              {scanning && (
                <div className="bg-primary/10 border border-primary rounded-lg p-4 text-center">
                  <p className="text-sm font-medium">
                    📷 Scanner Active - Point camera at QR code
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Position the QR code within the highlighted box
                  </p>
                </div>
              )}

              {cameraError && (
                <div className="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">Camera Access Failed</p>
                      <p className="text-sm mt-1">{cameraError}</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mt-3 pt-3 border-t border-destructive/20">
                    <p className="font-medium">Troubleshooting:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Allow camera permissions in your browser settings</li>
                      <li>Make sure no other app is using the camera</li>
                      <li>Try refreshing the page</li>
                      <li>Use the Manual Input tab below as an alternative</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {!scanning ? (
                  <Button onClick={startScanning} size="lg" className="w-full md:w-auto md:min-w-[200px]">
                    <Camera className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    <span className="text-sm md:text-base">Start Scanner</span>
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="destructive" size="lg" className="w-full md:w-auto md:min-w-[200px]">
                    <CameraOff className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    <span className="text-sm md:text-base">Stop Scanner</span>
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-qr" className="text-sm md:text-base">QR Code / Team Token</Label>
                  <Input
                    id="manual-qr"
                    placeholder="Paste or type the QR code here..."
                    value={manualQRCode}
                    onChange={(e) => setManualQRCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleManualCheckIn();
                      }
                    }}
                    className="text-sm md:text-base h-11 md:h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the team's QR token and press Enter or click Check In
                  </p>
                </div>
                <Button onClick={handleManualCheckIn} className="w-full h-11 md:h-10" size="lg">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  <span className="text-sm md:text-base">Check In Team</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters - Mobile Optimized */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 md:h-10"
              />
            </div>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue placeholder="All Tracks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                {tracks.map((track) => (
                  <SelectItem key={track.id} value={track.name}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.name}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-11 md:h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="not-checked-in">Not Checked In</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={exportCheckinList} variant="outline" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teams List - Mobile: Cards, Desktop: Table */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Teams ({filteredTeams.length})</CardTitle>
          <CardDescription className="text-xs md:text-sm">Manage team check-in status</CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile View - Cards */}
          <div className="block md:hidden space-y-2 px-4 pb-4">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">Team #{team.team_number}</p>
                    </div>
                    {team.checked_in ? (
                      <Badge className="bg-green-500 shrink-0 ml-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        <span className="text-xs">In</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 ml-2">
                        <XCircle className="h-3 w-3 mr-1" />
                        <span className="text-xs">Out</span>
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">{team.tracks.name}</Badge>
                    <Badge variant="secondary" className="text-xs">{team.rooms.name}</Badge>
                  </div>

                  {team.checked_in_at && (
                    <p className="text-xs text-muted-foreground">
                      Checked in: {new Date(team.checked_in_at).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTeamQR(team)}
                      className="flex-1 h-9"
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      <span className="text-xs">QR Code</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={team.checked_in ? "destructive" : "default"}
                      onClick={() => handleManualToggle(team.id, team.checked_in)}
                      className="flex-1 h-9"
                    >
                      <span className="text-xs">{team.checked_in ? "Undo" : "Check In"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team #</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checked In At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.team_number}</TableCell>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>{team.tracks.name}</TableCell>
                    <TableCell>{team.rooms.name}</TableCell>
                    <TableCell>
                      {team.checked_in ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Checked In
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {team.checked_in_at
                        ? new Date(team.checked_in_at).toLocaleString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTeamQR(team)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={team.checked_in ? "destructive" : "default"}
                        onClick={() => handleManualToggle(team.id, team.checked_in)}
                      >
                        {team.checked_in ? "Undo" : "Check In"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTeams.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm md:text-base px-4">
              No teams found matching the filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog - Mobile Optimized */}
      <Dialog open={!!selectedTeamQR} onOpenChange={() => setSelectedTeamQR(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{selectedTeamQR?.name}</DialogTitle>
            <DialogDescription className="text-sm md:text-base">Team #{selectedTeamQR?.team_number}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 md:py-6">
            {selectedTeamQR && (
              <>
                <div className="bg-white p-3 md:p-4 rounded-lg">
                  <QRCodeSVG
                    value={selectedTeamQR.qr_token}
                    size={Math.min(window.innerWidth - 100, 200)}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="mt-4 w-full space-y-2">
                  <div className="bg-muted p-2 md:p-3 rounded text-center">
                    <p className="text-xs text-muted-foreground mb-1">Team Token:</p>
                    <code className="text-xs md:text-sm font-mono break-all">{selectedTeamQR.qr_token}</code>
                  </div>
                  <p className="text-xs text-muted-foreground text-center break-all px-2">
                    {window.location.origin}/team-checkin/{selectedTeamQR.id}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTeamQR.qr_token);
                      toast({
                        title: "Token Copied",
                        description: "Team token copied to clipboard",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10"
                  >
                    Copy Token
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/team-checkin/${selectedTeamQR.id}`
                      );
                      toast({
                        title: "Link Copied",
                        description: "Check-in link copied to clipboard",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10"
                  >
                    Copy Link
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
