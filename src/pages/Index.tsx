import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wrench, BarChart3, Code, Key, Headphones, Utensils, Wine, Zap, Scan, Car, Radio, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/lovable-uploads/99c12b37-6cab-446c-a8f9-0ede24e2a6f2.png" alt="Melanated Campout" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Melanated Campout 2025</h1>
          <p className="text-muted-foreground mb-2">RFID Management System</p>
          <Badge variant="outline" className="mb-4">Veterans Campground, Cordele, GA • Sep 26-28, 2025</Badge>
        </div>

        {/* Staff Operations - Hero Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-3">
            <Wrench className="h-6 w-6 text-primary" />
            Staff Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* RFID Assignment - Hero Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:scale-[1.02] animate-fade-in" onClick={() => navigate("/rfid-assignment")}>
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Key className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl text-primary">RFID Assignment</h3>
                </div>
                <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                  Assign RFID tags to attendees using USB scanner. Primary staff function for event setup.
                </p>
                <div className="flex items-center text-sm text-primary/70 font-medium">
                  <span>Click to access →</span>
                </div>
              </CardContent>
            </Card>

            {/* Staff Hub - Hero Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10 hover:scale-[1.02] animate-fade-in" onClick={() => navigate("/staff-hub")}>
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <Wrench className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="font-bold text-xl text-secondary">Staff Hub</h3>
                </div>
                <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                  Comprehensive staff tools for activation, deactivation, and attendee management.
                </p>
                <div className="flex items-center text-sm text-secondary/70 font-medium">
                  <span>Click to access →</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attendee Services - Standard Section */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Attendee Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Self-Service Activation */}
            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-accent/20 bg-accent/5 hover:bg-accent/10" onClick={() => navigate("/activation")}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-accent">Self-Service</h3>
                </div>
                <p className="text-sm text-muted-foreground">Attendees activate their own wristbands</p>
              </CardContent>
            </Card>

            {/* Headphones Station */}
            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-success/20 bg-success/5 hover:bg-success/10" onClick={() => navigate("/headphones-station")}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Headphones className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-success">Headphones</h3>
                </div>
                <p className="text-sm text-muted-foreground">Silent disco headphone rental</p>
              </CardContent>
            </Card>

            {/* Meal Station */}
            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-warning/20 bg-warning/5 hover:bg-warning/10" onClick={() => navigate("/meal-station")}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Utensils className="h-5 w-5 text-warning" />
                  <h3 className="font-semibold text-warning">Meals</h3>
                </div>
                <p className="text-sm text-muted-foreground">Breakfast, lunch, and dinner service</p>
              </CardContent>
            </Card>

            {/* Drinks Station */}
            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-info/20 bg-info/5 hover:bg-info/10" onClick={() => navigate("/drinks-station")}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Wine className="h-5 w-5 text-info" />
                  <h3 className="font-semibold text-info">Drinks</h3>
                </div>
                <p className="text-sm text-muted-foreground">Beverage redemption service</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Equipment Stations - Compact Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-5 text-center flex items-center justify-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Equipment Stations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {/* Golf Carts Station */}
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted/20 hover:border-warning/30 bg-card" onClick={() => navigate("/golf-carts-station")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-warning" />
                  <h3 className="font-medium text-sm">Golf Carts</h3>
                </div>
                <p className="text-xs text-muted-foreground">Rental & check-in/out</p>
              </CardContent>
            </Card>

            {/* Walkie Talkies Station */}
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted/20 hover:border-info/30 bg-card" onClick={() => navigate("/walkie-talkies-station")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="h-4 w-4 text-info" />
                  <h3 className="font-medium text-sm">Walkie Talkies</h3>
                </div>
                <p className="text-xs text-muted-foreground">Two-way radio rental</p>
              </CardContent>
            </Card>

            {/* Fanny Packs Station */}
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted/20 hover:border-accent/30 bg-card" onClick={() => navigate("/fanny-packs-station")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-accent" />
                  <h3 className="font-medium text-sm">Fanny Packs</h3>
                </div>
                <p className="text-xs text-muted-foreground">Rental & check-in/out</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Management & Analytics - Minimal Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-5 text-center flex items-center justify-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Management & Analytics
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {/* Staff Equipment Hub */}
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted/20 hover:border-primary/30 bg-card flex-shrink-0" onClick={() => navigate("/equipment-hub")}>
              <CardContent className="p-3 flex items-center gap-3">
                <Scan className="h-4 w-4 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-sm">Equipment Hub</h3>
                  <p className="text-xs text-muted-foreground">Staff checkout</p>
                </div>
              </CardContent>
            </Card>

            {/* Admin Reports */}
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted/20 hover:border-secondary/30 bg-card flex-shrink-0" onClick={() => navigate("/reports")}>
              <CardContent className="p-3 flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-secondary flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-sm">Reports</h3>
                  <p className="text-xs text-muted-foreground">Analytics</p>
                </div>
              </CardContent>
            </Card>

            {/* Developer Tools */}
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-muted/20 hover:border-accent/30 bg-card flex-shrink-0" onClick={() => navigate("/dev")}>
              <CardContent className="p-3 flex items-center gap-3">
                <Code className="h-4 w-4 text-accent flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-sm">Dev Tools</h3>
                  <p className="text-xs text-muted-foreground">Debug</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Need help? Contact event staff for assistance.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;