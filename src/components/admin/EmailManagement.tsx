import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  QrCode,
  FileText,
} from "lucide-react";
import EmailComposer from "./EmailComposer";
import {
  sendBulkEmails,
  sendPersonalizedEmails,
  markdownToHtml,
  createEmailTemplate,
  createCheckinEmailTemplate,
  type TeamData,
} from "@/lib/emailService";

interface Team {
  id: string;
  name: string;
  team_number: string;
  email: string | null;
  college: string | null;
  members: string[] | null;
  problem_statement: string | null;
  total_score: number;
  checked_in: boolean;
  checked_in_at: string | null;
  tracks: { name: string };
  rooms: { name: string };
}

export default function EmailManagement() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [emailStats, setEmailStats] = useState({ total: 0, withEmail: 0, withoutEmail: 0 });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*, tracks(name), rooms(name)")
      .order("team_number");

    if (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
      return;
    }

    const teamsData = data as Team[];
    setTeams(teamsData);

    // Calculate stats
    const withEmail = teamsData.filter(t => t.email).length;
    setEmailStats({
      total: teamsData.length,
      withEmail,
      withoutEmail: teamsData.length - withEmail,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const teamsWithEmail = teams.filter(t => t.email).map(t => t.id);
      setSelectedTeams(new Set(teamsWithEmail));
    } else {
      setSelectedTeams(new Set());
    }
  };

  const handleSelectTeam = (teamId: string, checked: boolean) => {
    const newSelected = new Set(selectedTeams);
    if (checked) {
      newSelected.add(teamId);
    } else {
      newSelected.delete(teamId);
    }
    setSelectedTeams(newSelected);
  };

  const handleSendCustomEmail = async (subject: string, content: string) => {
    if (selectedTeams.size === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one team to send email to",
        variant: "destructive",
      });
      throw new Error("No recipients selected");
    }

    setSending(true);

    try {
      // Get full team objects for template variable replacement
      const selectedTeamsList = teams.filter(
        t => selectedTeams.has(t.id) && t.email
      ) as TeamData[];

      // Convert markdown to HTML and wrap in template
      const htmlContent = markdownToHtml(content);
      const contentTemplate = createEmailTemplate(htmlContent);

      // Send personalized emails with template variable replacement
      const result = await sendPersonalizedEmails(
        selectedTeamsList,
        subject,
        contentTemplate,
        window.location.origin
      );

      toast({
        title: "Email Sent",
        description: `Successfully sent to ${result.success} out of ${result.total} recipients`,
      });

      // Clear selection after sending
      setSelectedTeams(new Set());
    } catch (error: any) {
      console.error("Send email error:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleSendCheckinLinks = async () => {
    const teamsWithEmail = teams.filter(t => t.email);

    if (teamsWithEmail.length === 0) {
      toast({
        title: "No Email Addresses",
        description: "No teams have email addresses configured",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Send check-in links to ${teamsWithEmail.length} teams?`
    );

    if (!confirmed) return;

    setSending(true);

    try {
      const results = [];

      for (const team of teamsWithEmail) {
        const checkinUrl = `${window.location.origin}/team-checkin/${team.id}`;
        const emailHtml = createCheckinEmailTemplate(
          team.name,
          team.team_number,
          checkinUrl
        );

        const { sendEmail } = await import("@/lib/emailService");
        const result = await sendEmail({
          to: [team.email!],
          subject: `Prodathon Check-in Link - ${team.name}`,
          html: emailHtml,
        });

        results.push(result);

        // Add small delay between sends
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const successCount = results.filter(r => r.success).length;

      toast({
        title: "Check-in Links Sent",
        description: `Successfully sent to ${successCount} out of ${teamsWithEmail.length} teams`,
      });
    } catch (error: any) {
      console.error("Send check-in links error:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send check-in links",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendToSelected = async () => {
    if (selectedTeams.size === 0) {
      toast({
        title: "No Teams Selected",
        description: "Please select teams to send check-in links to",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const selectedTeamsList = teams.filter(t => selectedTeams.has(t.id) && t.email);

      for (const team of selectedTeamsList) {
        const checkinUrl = `${window.location.origin}/team-checkin/${team.id}`;
        const emailHtml = createCheckinEmailTemplate(
          team.name,
          team.team_number,
          checkinUrl
        );

        const { sendEmail } = await import("@/lib/emailService");
        await sendEmail({
          to: [team.email!],
          subject: `Prodathon Check-in Link - ${team.name}`,
          html: emailHtml,
        });

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Success",
        description: `Check-in links sent to ${selectedTeamsList.length} teams`,
      });

      setSelectedTeams(new Set());
    } catch (error: any) {
      console.error("Send error:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send check-in links",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const teamsWithEmail = teams.filter(t => t.email);
  const teamsWithoutEmail = teams.filter(t => !t.email);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Email Management</h2>
        <p className="text-muted-foreground">Send emails and check-in links to teams</p>
      </div>

      {/* Email Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{emailStats.withEmail}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Without Email</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{emailStats.withoutEmail}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Send pre-configured emails to teams</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={handleSendCheckinLinks}
              disabled={sending || teamsWithEmail.length === 0}
              size="lg"
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 mr-2" />
                  Send Check-in Links to All
                </>
              )}
            </Button>
            <Button
              onClick={handleSendToSelected}
              disabled={sending || selectedTeams.size === 0}
              size="lg"
              variant="outline"
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send to Selected ({selectedTeams.size})
                </>
              )}
            </Button>
          </div>

          {teamsWithoutEmail.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {teamsWithoutEmail.length} team(s) don't have email addresses configured.
                Update team details to enable email notifications.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">
            <FileText className="h-4 w-4 mr-2" />
            Compose Custom Email
          </TabsTrigger>
          <TabsTrigger value="recipients">
            <Users className="h-4 w-4 mr-2" />
            Manage Recipients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <EmailComposer onSend={handleSendCustomEmail} />
        </TabsContent>

        <TabsContent value="recipients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Recipients</CardTitle>
              <CardDescription>
                Select teams to send emails to. Only teams with email addresses can be selected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedTeams.size === teamsWithEmail.length && teamsWithEmail.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Select all teams with email ({teamsWithEmail.length})
                  </label>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Team #</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTeams.has(team.id)}
                            onCheckedChange={(checked) =>
                              handleSelectTeam(team.id, checked as boolean)
                            }
                            disabled={!team.email}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{team.team_number}</TableCell>
                        <TableCell>{team.name}</TableCell>
                        <TableCell>{team.tracks.name}</TableCell>
                        <TableCell>
                          {team.email ? (
                            <span className="text-sm">{team.email}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No email</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {team.email ? (
                            <Badge variant="outline" className="bg-green-50">
                              <Mail className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-50">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No Email
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {teams.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No teams found. Create teams first to send emails.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
