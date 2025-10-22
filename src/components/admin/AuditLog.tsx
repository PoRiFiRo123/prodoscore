import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entity_id: string;
  admin_id: string;
  admin_email: string;
  admin_full_name?: string;
  previous_state: any;
  new_state: any;
}

const AuditLog = () => {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState({
    actionType: "all",
    dateRange: "all",
    entity: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const actionTypes = [
    "TRACK_CREATED", "TRACK_UPDATED", "TRACK_DELETED",
    "ROOM_CREATED", "ROOM_UPDATED", "ROOM_DELETED", "ROOM_LOCKED", "ROOM_UNLOCKED", "ROOM_LOCKED_BY_TRACK_SEAL",
    "TEAM_CREATED", "TEAM_UPDATED", "TEAM_DELETED",
    "JUDGE_CREATED", "JUDGE_ROOM_ASSIGNED", "JUDGE_ROOM_UNASSIGNED",
    "CRITERION_CREATED", "CRITERION_DELETED",
    "REPORT_GENERATED", "TRACK_SEALED",
    "SCORE_SUBMITTED", "SCORE_UPDATED"
  ];
  const entityTypes = ["tracks", "rooms", "teams", "judges", "criteria", "judge_assignments", "reports", "scores"];

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters]);

  const fetchAuditLogs = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("audit_logs");

    if (error) {
      console.error("Error fetching audit logs:", error);
      return;
    }

    const allLogs = profiles
      .flatMap((profile: any) => profile.audit_logs || [])
      .sort((a: any, b: any) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()) as AuditLogEntry[];

    setAuditLogs(allLogs);
  };

  const applyFilters = () => {
    let tempLogs = [...auditLogs];

    if (filters.actionType !== "all") {
      tempLogs = tempLogs.filter(log => log.action === filters.actionType);
    }

    if (filters.entity !== "all") {
      tempLogs = tempLogs.filter(log => log.entity === filters.entity);
    }

    if (filters.dateRange !== "all") {
      const now = new Date();
      tempLogs = tempLogs.filter(log => {
        const logDate = parseISO(log.timestamp);
        switch (filters.dateRange) {
          case "today": return logDate.toDateString() === now.toDateString();
          case "last7days": return now.getTime() - logDate.getTime() < 7 * 24 * 60 * 60 * 1000;
          case "last30days": return now.getTime() - logDate.getTime() < 30 * 24 * 60 * 60 * 1000;
          case "thismonth": return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
          default: return true;
        }
      });
    }

    setFilteredLogs(tempLogs);
    setCurrentPage(1);
  };

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const downloadLogs = (formatType: "CSV" | "JSON") => {
    let filename = `audit_logs_${format(new Date(), "yyyyMMddHHmmss")}`;
    let dataStr;

    if (formatType === "JSON") {
      dataStr = JSON.stringify(filteredLogs, null, 2);
      filename += ".json";
    } else {
      const headers = Object.keys(filteredLogs[0] || {}).join(",");
      const rows = filteredLogs.map(log => 
        Object.values(log).map(value => {
          if (typeof value === "object" && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          } else {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
        }).join(",")
      );
      dataStr = [headers, ...rows].join("\n");
      filename += ".csv";
    }

    const blob = new Blob([dataStr], { type: formatType === "JSON" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: `Logs Downloaded as ${formatType}`,
      description: `The audit logs have been successfully downloaded as a ${formatType} file.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">Review all administrative actions performed in the system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="actionType">Action Type</Label>
            <Select
              value={filters.actionType}
              onValueChange={(value) => setFilters({ ...filters, actionType: value })}
            >
              <SelectTrigger id="actionType">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity">Entity</Label>
            <Select
              value={filters.entity}
              onValueChange={(value) => setFilters({ ...filters, entity: value })}
            >
              <SelectTrigger id="entity">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
            >
              <SelectTrigger id="dateRange">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thismonth">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Audit Log Entries</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadLogs("CSV")}>
              <Download className="h-4 w-4 mr-2" /> Download CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadLogs("JSON")}>
              <Download className="h-4 w-4 mr-2" /> Download JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No audit log entries found matching your criteria.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(parseISO(log.timestamp), "MMM dd, yyyy HH:mm:ss")}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entity}</TableCell>
                      <TableCell>{log.entity_id.substring(0, 8)}...</TableCell>
                      <TableCell>{log.admin_full_name || log.admin_email}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Details</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Log Entry Details</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4">
                              <div>
                                <p className="font-medium">Action: <span className="font-normal">{log.action}</span></p>
                                <p className="font-medium">Entity: <span className="font-normal">{log.entity} (ID: {log.entity_id})</span></p>
                                <p className="font-medium">Performed By: <span className="font-normal">{log.admin_full_name || log.admin_email}</span></p>
                                <p className="font-medium">Timestamp: <span className="font-normal">{format(parseISO(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                                  </span></p>
                              </div>
                              {log.previous_state && (
                                <div>
                                  <h4 className="font-semibold mt-2">Previous State:</h4>
                                  <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                                    {JSON.stringify(log.previous_state, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_state && (
                                <div>
                                  <h4 className="font-semibold mt-2">New State:</h4>
                                  <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
                                    {JSON.stringify(log.new_state, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
