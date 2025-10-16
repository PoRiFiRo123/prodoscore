import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Gavel, Trophy, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Prodothon Judging System
              </h1>
            </div>
            <Button variant="outline" onClick={() => navigate("/auth")}>
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
              <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary-light bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
                Welcome to Prodothon
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
                Professional hackathon judging and scoring platform
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-primary/50 animate-in fade-in slide-in-from-left duration-700">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Admin Panel</CardTitle>
                  <CardDescription className="text-base">
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

              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-accent/50 animate-in fade-in slide-in-from-right duration-700">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <Gavel className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-2xl">Judge Access</CardTitle>
                  <CardDescription className="text-base">
                    Enter your room passcode to start judging
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/judge")} 
                    className="w-full bg-accent hover:bg-accent/90"
                    size="lg"
                  >
                    Start Judging
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="mt-20 grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Real-time Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  Live leaderboard updates as judges score teams
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold">Multi-Room Support</h3>
                <p className="text-sm text-muted-foreground">
                  Organize multiple tracks and judging rooms
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold">Secure Access</h3>
                <p className="text-sm text-muted-foreground">
                  Passcode-protected rooms for judges
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              This website is made by <span className="font-semibold text-foreground">Nishit R Kirani</span> from{" "}
              <span className="font-semibold text-foreground">BNM Institute of Technology</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Event Management Committee (EMC) is responsible for Prodothon
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
