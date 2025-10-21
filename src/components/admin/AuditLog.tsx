import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditEntry {
  timestamp: string;
  admin_id: string;
  admin_name: string;
  action: string;
  table: string;
  previous_state?: any;
  new_state?: any;
}

export default function AuditLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string>("");

  useEffect(() => {
    const initAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentAdminId(session.user.id);
        loadLogs();
      }
    };
    initAdmin();
  }, []);

  const loadLogs = () => {
    const storedLogs = localStorage.getItem("audit_logs");
    if (storedLogs) {
      setLogs(JSON.parse(storedLogs));
    }
  };

  const addLog = (action: string, table: string, previousState?: any, newState?: any) => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      admin_id: currentAdminId,
      admin_name: "Admin User",
      action,
      table,
      previous_state: previousState,
      new_state: newState,
    };

    const updatedLogs = [entry, ...logs];
    localStorage.setItem("audit_logs", JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Admin ID", "Action", "Table"].join(","),
      ...logs.map((log) =>
        [
          log.timestamp,
          log.admin_id,
          log.action,
          log.table,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Audit log exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-muted-foreground">Track all administrative actions</p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            All administrative changes are tracked here
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit logs recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Admin ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 50).map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.table}</TableCell>
                    <TableCell className="text-xs">{log.admin_id.substring(0, 8)}...</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
