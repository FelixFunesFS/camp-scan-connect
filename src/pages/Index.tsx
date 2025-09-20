import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wrench, BarChart3, Code, Key, Headphones, Utensils, Wine, Zap, Scan } from "lucide-react";
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

        {/* Attendee Services */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Attendee Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Self-Service Activation */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50/30" onClick={() => navigate("/activation")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-6 w-6 text-blue-600" />
                  <h3 className="font-semibold text-lg text-blue-700">Self-Service Activation</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Attendees activate their own wristbands using phone numbers</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/activation");
                  }}
                  className="w-full border-blue-300 hover:bg-blue-100"
                >
                  Access Self-Service
                </Button>
              </CardContent>
            </Card>

            {/* Headphones Station */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-purple-200 bg-purple-50/30" onClick={() => navigate("/headphones-station")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Headphones className="h-6 w-6 text-purple-600" />
                  <h3 className="font-semibold text-lg text-purple-700">Headphones Station</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Silent disco headphone rental for attendees</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/headphones-station");
                  }}
                  className="w-full border-purple-300 hover:bg-purple-100"
                >
                  Access Headphones
                </Button>
              </CardContent>
            </Card>

            {/* Meal Station */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 bg-green-50/30" onClick={() => navigate("/meal-station")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Utensils className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold text-lg text-green-700">Meal Station</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Breakfast, lunch, and dinner service</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/meal-station");
                  }}
                  className="w-full border-green-300 hover:bg-green-100"
                >
                  Access Meals
                </Button>
              </CardContent>
            </Card>

            {/* Drinks Station */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200 bg-orange-50/30" onClick={() => navigate("/drinks-station")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Wine className="h-6 w-6 text-orange-600" />
                  <h3 className="font-semibold text-lg text-orange-700">Drinks Station</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Beverage redemption service</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/drinks-station");
                  }}
                  className="w-full border-orange-300 hover:bg-orange-100"
                >
                  Access Drinks
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Staff Operations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-2">
            <Wrench className="h-5 w-5 text-slate-600" />
            Staff Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Staff Hub */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-slate-300 bg-slate-50/30 flex flex-col" onClick={() => navigate("/staff-hub")}>
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Wrench className="h-6 w-6 text-slate-600" />
                  <h3 className="font-semibold text-lg text-slate-700">Staff Hub</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">Comprehensive staff tools for activation, deactivation, and management</p>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/staff-hub");
                  }}
                  className="w-full bg-slate-600 hover:bg-slate-700 mt-auto"
                >
                  Access Staff Tools
                </Button>
              </CardContent>
            </Card>

            {/* Staff Equipment Hub */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-indigo-200 bg-indigo-50/30 flex flex-col" onClick={() => navigate("/equipment-hub")}>
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Scan className="h-6 w-6 text-indigo-600" />
                  <h3 className="font-semibold text-lg text-indigo-700">Staff Equipment Hub</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">Staff equipment checkout and management system</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/equipment-hub");
                  }}
                  className="w-full border-indigo-300 hover:bg-indigo-100 mt-auto"
                >
                  Access Equipment
                </Button>
              </CardContent>
            </Card>

            {/* RFID Assignment */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-secondary/50 bg-secondary/5 flex flex-col" onClick={() => navigate("/rfid-assignment")}>
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Key className="h-6 w-6 text-secondary" />
                  <h3 className="font-semibold text-lg">RFID Assignment</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">Assign RFID tags to attendees using USB scanner</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/rfid-assignment");
                  }}
                  className="w-full border-secondary/30 hover:bg-secondary/10 mt-auto"
                >
                  Access Assignment
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Management & Analytics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6 text-center flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Management & Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Admin Reports */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-emerald-200 bg-emerald-50/30" onClick={() => navigate("/reports")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="h-6 w-6 text-emerald-600" />
                  <h3 className="font-semibold text-lg text-emerald-700">Admin Reports</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Real-time check-ins, headphone tracking, and usage analytics</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/reports");
                  }}
                  className="w-full border-emerald-300 hover:bg-emerald-100"
                >
                  Access Reports
                </Button>
              </CardContent>
            </Card>

            {/* Developer Tools */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-violet-200 bg-violet-50/30" onClick={() => navigate("/dev")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Code className="h-6 w-6 text-violet-600" />
                  <h3 className="font-semibold text-lg text-violet-700">Developer Tools</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Webhook monitoring, sync history, analytics, and debug tools</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/dev");
                  }}
                  className="w-full border-violet-300 hover:bg-violet-100"
                >
                  Access Dev Tools
                </Button>
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