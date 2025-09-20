import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Settings, BarChart3, ArrowRight, Key, Headphones, Utensils, Wine, Zap, Scan, Car, Radio, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/99c12b37-6cab-446c-a8f9-0ede24e2a6f2.png" 
              alt="Melanated Campout" 
              className="h-20 w-auto" 
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Melanated Campout 2025
          </h1>
          <p className="text-xl text-muted-foreground mb-6">RFID Management System</p>
          <Badge variant="secondary" className="text-sm px-4 py-2">
            Veterans Campground, Cordele, GA • Sep 26-28, 2025
          </Badge>
        </div>

        {/* Primary Action Cards */}
        <div className="grid gap-8 mb-16">
          {/* Staff Operations */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-primary/20 hover:border-primary/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                Staff Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-6">
                Complete RFID management tools for event staff
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/rfid-assignment")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Key className="h-5 w-5 text-primary" />
                    <span className="font-medium">RFID Assignment</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Assign tags to attendees</p>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/staff-hub")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <span className="font-medium">Staff Hub</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Activation & management</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendee Services */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-accent/20 hover:border-accent/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                Attendee Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-6">
                Self-service stations and rental equipment for attendees
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/activation")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Zap className="h-5 w-5 text-accent" />
                    <span className="font-medium text-sm">Self-Service</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/headphones-station")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Headphones className="h-5 w-5 text-accent" />
                    <span className="font-medium text-sm">Headphones</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/meal-station")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Utensils className="h-5 w-5 text-accent" />
                    <span className="font-medium text-sm">Meals</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/drinks-station")}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Wine className="h-5 w-5 text-accent" />
                    <span className="font-medium text-sm">Drinks</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
              
              {/* Equipment Subsection */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Equipment Rentals</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/golf-carts-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-1">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Golf Carts</span>
                    </div>
                  </div>
                  <div 
                    className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/walkie-talkies-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-1">
                      <Radio className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Walkies</span>
                    </div>
                  </div>
                  <div 
                    className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/fanny-packs-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Fanny Packs</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-secondary/20 hover:border-secondary/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <BarChart3 className="h-6 w-6 text-secondary" />
                </div>
                Management & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-6">
                Reports, analytics, and administrative tools
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/equipment-hub")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Scan className="h-5 w-5 text-secondary" />
                    <span className="font-medium">Equipment Hub</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Staff checkout</p>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/reports")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="h-5 w-5 text-secondary" />
                    <span className="font-medium">Reports</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Analytics dashboard</p>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/dev")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Settings className="h-5 w-5 text-secondary" />
                    <span className="font-medium">Dev Tools</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Debug utilities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Need assistance? Contact event staff for help.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;