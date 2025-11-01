import { useState, useEffect, useRef } from "react";
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
  Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);

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
      stopScanning();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teams, selectedTrack, selectedRoom, filterStatus, searchQuery]);

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
    if (!readerRef.current) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      );

      setScanning(true);
      toast({
        title: "Scanner Started",
        description: "Point camera at team QR code",
      });
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast({
        title: "Scanner Error",
        description: "Could not access camera",
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code detected:", decodedText);
    await handleCheckIn(decodedText);
  };

  const onScanFailure = (error: any) => {
    // Ignore scan failures (too noisy)
  };

  const handleCheckIn = async (qrToken: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("check_in_team", {
        _qr_token: qrToken,
        _admin_id: userId,
      });

      if (error) throw error;

      const result = data[0];

      if (result.success) {
        toast({
          title: "Check-in Successful!",
          description: `${result.team_name} has been checked in`,
        });
        fetchTeams();
      } else {
        toast({
          title: "Check-in Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to check in team",
        variant: "destructive",
      });
    }
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
          team.name,
          team.tracks.name,
          team.rooms.name,
          team.checked_in ? "Yes" : "No",
          team.checked_in_at ? new Date(team.checked_in_at).toLocaleString() : "N/A",
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Team Check-in</h2>
        <p className="text-muted-foreground">Scan QR codes or manually check in teams</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentageCheckedIn}%</div>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>Use your camera to scan team QR codes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="qr-reader"
            ref={readerRef}
            className={`${scanning ? "border-2 border-primary rounded-lg overflow-hidden" : "hidden"}`}
            style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}
          />
          <div className="flex gap-2 justify-center">
            {!scanning ? (
              <Button onClick={startScanning} size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Start Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" size="lg">
                <CameraOff className="h-5 w-5 mr-2" />
                Stop Scanner
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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
            <Button onClick={exportCheckinList} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Check-in List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teams ({filteredTeams.length})</CardTitle>
          <CardDescription>Manage team check-in status</CardDescription>
        </CardHeader>
        <CardContent>
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
          {filteredTeams.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No teams found matching the filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedTeamQR} onOpenChange={() => setSelectedTeamQR(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTeamQR?.name}</DialogTitle>
            <DialogDescription>Team #{selectedTeamQR?.team_number}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {selectedTeamQR && (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG
                    value={selectedTeamQR.qr_token}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Share link: {window.location.origin}/team-checkin/{selectedTeamQR.id}
                </p>
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
                  className="mt-2"
                >
                  Copy Link
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
