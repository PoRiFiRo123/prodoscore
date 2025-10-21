import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Trophy, Users, Target, DoorOpen, Award, LayoutDashboard, BarChart2, UserCog, Activity, Upload, FileText, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminTracks from "@/components/admin/AdminTracks";
import AdminRooms from "@/components/admin/AdminRooms";
import AdminTeams from "@/components/admin/AdminTeams";
import AdminJudges from "@/components/admin/AdminJudges";
import Leaderboard from "@/components/Leaderboard";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminUserRoles } from "@/components/admin/AdminUserRoles";
import LiveAnalytics from "@/components/admin/LiveAnalytics";
import BulkImportExport from "@/components/admin/BulkImportExport";
import AuditLog from "@/components/admin/AuditLog";
import FinalizationWorkflow from "@/components/admin/FinalizationWorkflow";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user profile and role
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || session.user.email || "User");
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      } else {
        // No role assigned - redirect to judge interface by default
        navigate("/judge");
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole !== "admin") {
    navigate("/judge");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative">
                <Trophy className="h-8 w-8 text-primary" />
                <Award className="h-4 w-4 text-accent absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  PEMS Admin
                </h1>
                <p className="text-xs text-muted-foreground">Evaluation Management</p>
              </div>
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-20">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-12 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Live</span>
            </TabsTrigger>
            <TabsTrigger value="import-export" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import/Export</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="finalize" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Finalize</span>
            </TabsTrigger>
            <TabsTrigger value="user-roles" className="gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">User Roles</span>
            </TabsTrigger>
            <TabsTrigger value="tracks" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Tracks</span>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-2">
              <DoorOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Rooms</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="judges" className="gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Judges</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <LiveAnalytics />
          </TabsContent>

          <TabsContent value="import-export" className="space-y-4">
            <BulkImportExport />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLog />
          </TabsContent>

          <TabsContent value="finalize" className="space-y-4">
            <FinalizationWorkflow />
          </TabsContent>

          <TabsContent value="user-roles" className="space-y-4">
            <AdminUserRoles />
          </TabsContent>

          <TabsContent value="tracks" className="space-y-4">
            <AdminTracks />
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4">
            <AdminRooms />
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <AdminTeams />
          </TabsContent>

          <TabsContent value="judges" className="space-y-4">
            <AdminJudges />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <Leaderboard isAdmin={true} />
          </TabsContent>
        </Tabs>
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

export default Dashboard;
