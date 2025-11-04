import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Gavel, Trophy, Users, Vote } from "lucide-react";
import PublicLeaderboard from "@/components/PublicLeaderboard";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">
                Prodathon Judging System
              </h1>
            </button>
            <Button onClick={() => navigate("/auth")}>
              Admin Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-6 mb-16">
              <h2 className="text-4xl md:text-6xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <span className="text-primary">Welcome to </span>
                <span className="text-primary font-extrabold">Prodathon</span>
              </h2>
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
                Professional hackathon judging and scoring platform
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16">
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



            {/* Features */}
            <div className="mt-20 grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              <div className="text-center space-y-2 p-6 rounded-lg bg-card border hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">Real-time Scoring</h3>
                <p className="text-sm text-foreground/70">
                  Live leaderboard updates as judges score teams
                </p>
              </div>
              <div className="text-center space-y-2 p-6 rounded-lg bg-card border hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-3">
                  <Users className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">Multi-Room Support</h3>
                <p className="text-sm text-foreground/70">
                  Organize multiple tracks and judging rooms
                </p>
              </div>
              <div className="text-center space-y-2 p-6 rounded-lg bg-card border hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-7 w-7 text-success-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">Secure Access</h3>
                <p className="text-sm text-foreground/70">
                  Passcode-protected rooms for judges
                </p>
              </div>
            </div>

            {/* Public Voting CTA */}
            <div className="mt-20 mb-12">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <CardContent className="p-8 md:p-12 relative">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center backdrop-blur-sm border-2 border-primary/20">
                        <Vote className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">
                        <span className="text-primary">Cast Your Vote!</span>
                      </h3>
                      <p className="text-base md:text-lg text-muted-foreground mb-4">
                        Join the audience voting and support your favorite teams. Your votes contribute 10% to the final scores.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">Anonymous</span>
                        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">Real-time Results</span>
                        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">Live Teams</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => navigate("/public-voting")}
                        size="lg"
                        className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
                      >
                        <Vote className="h-5 w-5 mr-2" />
                        Vote Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Public Leaderboard Section */}
            <div className="mt-12 mb-32">
              <PublicLeaderboard />
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-border hover:border-primary bg-card animate-in fade-in slide-in-from-left duration-700">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4 group-hover:shadow-lg transition-all">
                    <Shield className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Admin Panel</CardTitle>
                  <CardDescription className="text-base text-foreground/70">
                    Manage tracks, rooms, teams, and judges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/auth")} 
                    className="w-full"
                    size="lg"
                  >
                    Access Admin Panel
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-border hover:border-primary bg-card animate-in fade-in slide-in-from-right duration-700">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4 group-hover:shadow-lg transition-all">
                    <Gavel className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Judge Access</CardTitle>
                  <CardDescription className="text-base text-foreground/70">
                    Enter your room passcode to start judging
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/judge")} 
                    className="w-full"
                    size="lg"
                  >
                    Start Judging
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card backdrop-blur-sm mt-auto shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-foreground/70">
                Developed by <span className="font-semibold text-foreground">Nishit R Kirani</span>
              </p>
              <div className="flex items-center justify-center">
                <img src="/bnmit.svg" alt="BNMIT Logo" className="h-6 w-auto mr-2" />
                <p className="text-xs text-foreground/60">© 2025</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
