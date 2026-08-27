import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Settings, BarChart3, ArrowRight, Key, Headphones, Utensils, Wine, Zap, Scan, Car, Radio, Package, DoorOpen, Shirt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEvent } from "@/contexts/EventContext";

const Index = () => {
  const navigate = useNavigate();
  const { selectedEvent } = useEvent();

  const dateRange = (() => {
    if (!selectedEvent?.starts_at) return null;
    const fmt = (d: string) =>
      new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const start = fmt(selectedEvent.starts_at);
    const end = selectedEvent.ends_at ? fmt(selectedEvent.ends_at) : null;
    return `${start}${end ? `-${end.replace(/^\w+\s/, "")}` : ""}, ${selectedEvent.year}`;
  })();

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
            {selectedEvent?.name ?? "Melanated Campout"}
          </h1>
          <p className="text-xl text-muted-foreground mb-6">Wristband Management System</p>
          <Badge variant="secondary" className="text-sm px-4 py-2">
            Veterans Campground, Cordele, GA{dateRange ? ` • ${dateRange}` : ""}
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
                Complete RFID management tools and staff-operated stations
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/assignment")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Key className="h-5 w-5 text-primary" />
                    <span className="font-medium">Credential Assignment</span>
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
              
              {/* Staff-Operated Stations */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Staff-Operated Stations</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <div 
                    className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/main-gate-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">Main Gate</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div 
                    className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/headphones-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Headphones className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">Headphones</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div 
                    className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/tshirts-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Shirt className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">T-Shirts</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div 
                    className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/meal-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Utensils className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">Meals</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div 
                    className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                    onClick={() => navigate("/drinks-station")}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Wine className="h-5 w-5 text-primary" />
                      <span className="font-medium text-sm">Drinks</span>
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Self-Service */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-accent/20 hover:border-accent/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                Self-Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-6">
                Attendee self-service check-in station
              </p>
              <div className="grid gap-4">
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/activation")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-5 w-5 text-accent" />
                    <span className="font-medium">Self-Service Check-In</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Check-in and activate your wristband</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Rentals */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-muted/20 hover:border-muted/40">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-muted/10">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                Equipment Rentals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-6">
                Independent rental equipment checkout and return
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/golf-carts-station")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Golf Carts</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Rental checkout</p>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/walkie-talkies-station")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Radio className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Walkie-Talkies</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Radio rentals</p>
                </div>
                <div 
                  className="p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group/item"
                  onClick={() => navigate("/fanny-packs-station")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Fanny Packs</span>
                    <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">Storage solutions</p>
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