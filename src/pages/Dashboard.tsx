import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Trophy, Users, Target, DoorOpen, Award, LayoutDashboard, BarChart2, UserCog, Activity, Upload, FileText, Lock, MessageSquare, Menu, X, CheckCircle, Mail, Vote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminTracks from "@/components/admin/AdminTracks";
import AdminRooms from "@/components/admin/AdminRooms";
import AdminTeams from "@/components/admin/AdminTeams";
import AdminJudges from "@/components/admin/AdminJudges";
import AdminSnippets from "@/components/admin/AdminSnippets";
import Leaderboard from "@/components/Leaderboard";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminUserRoles } from "@/components/admin/AdminUserRoles";
import LiveAnalytics from "@/components/admin/LiveAnalytics";
import BulkImportExport from "@/components/admin/BulkImportExport";
import AuditLog from "@/components/admin/AuditLog";
import FinalizationWorkflow from "@/components/admin/FinalizationWorkflow";
import TeamCheckIn from "@/components/admin/TeamCheckIn";
import EmailManagement from "@/components/admin/EmailManagement";
import VotingAnalytics from "@/components/admin/VotingAnalytics";

const navItems = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "analytics", label: "Analytics", icon: BarChart2 },
  { value: "live", label: "Live", icon: Activity },
  { value: "voting", label: "Voting", icon: Vote },
  { value: "checkin", label: "Check-in", icon: CheckCircle },
  { value: "emails", label: "Emails", icon: Mail },
  { value: "import-export", label: "Import/Export", icon: Upload },
  { value: "audit", label: "Audit", icon: FileText },
  { value: "finalize", label: "Finalize", icon: Lock },
  { value: "user-roles", label: "User Roles", icon: UserCog },
  { value: "tracks", label: "Tracks", icon: Target },
  { value: "rooms", label: "Rooms", icon: DoorOpen },
  { value: "teams", label: "Teams", icon: Users },
  { value: "judges", label: "Judges", icon: Award },
  { value: "snippets", label: "Snippets", icon: MessageSquare },
  { value: "leaderboard", label: "Leaderboard", icon: Trophy },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTab = location.hash.replace("#", "") || "overview";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

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

  const handleTabChange = (value: string) => {
    navigate(`#${value}`);
    if(isSidebarOpen) {
        setIsSidebarOpen(false);
    }
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

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview />;
      case 'analytics': return <AdminAnalytics />;
      case 'live': return <LiveAnalytics />;
      case 'voting': return <VotingAnalytics />;
      case 'checkin': return <TeamCheckIn />;
      case 'emails': return <EmailManagement />;
      case 'import-export': return <BulkImportExport />;
      case 'audit': return <AuditLog />;
      case 'finalize': return <FinalizationWorkflow />;
      case 'user-roles': return <AdminUserRoles />;
      case 'tracks': return <AdminTracks />;
      case 'rooms': return <AdminRooms />;
      case 'teams': return <AdminTeams />;
      case 'judges': return <AdminJudges />;
      case 'snippets': return <AdminSnippets />;
      case 'leaderboard': return <Leaderboard isAdmin={true} />;
      default: return <AdminOverview />;
    }
  };

  const Sidebar = () => (
    <aside className={`fixed top-0 left-0 h-screen w-64 bg-card border-r z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
                <button 
                  onClick={() => navigate("/")}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="relative">
                    <Trophy className="h-8 w-8 text-primary" />
                    <Award className="h-4 w-4 text-accent absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      PEMS Admin
                    </h1>
                  </div>
                </button>
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                    <X className="h-6 w-6" />
                </Button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map(({ value, label, icon: Icon }) => (
                    <Button
                        key={value}
                        variant={activeTab === value ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleTabChange(value)}
                    >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                    </Button>
                ))}
            </nav>
        </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
        
        <div className="flex min-h-screen">
            <Sidebar />
            
            <div className="flex flex-col flex-1 md:ml-64">
                <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                                <Menu className="h-6 w-6" />
                            </Button>
                            <div className="flex-1" />
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

                <main className="flex-1 container mx-auto px-4 py-8">
                    <div className="bg-card p-6 rounded-lg shadow-sm">
                        {renderContent()}
                    </div>
                </main>
                
                <footer className="border-t bg-white mt-auto">
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <img src="/logo.svg" alt="BNM 25" className="h-12" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">BNM Institute of Technology</p>
                          <p className="text-xs text-gray-600">Academic Excellence</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <img src="/bnmit.svg" alt="Event Committee" className="h-12" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Event Management Committee</p>
                          <p className="text-xs text-gray-600">Prodathon Organizers</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">Developed by <span className="font-semibold text-gray-900">Nishit R Kirani</span></p>
                        <img src="/logo.svg" alt="Developer" className="h-6" />
                        <p className="text-sm text-gray-600">© 2025</p>
                      </div>
                    </div>
                  </div>
                </footer>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;