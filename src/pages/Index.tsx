import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scan, Zap, Key, Code, BarChart3, Headphones, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
const Index = () => {
  const navigate = useNavigate();
  const roles = [];

  const stations = [{
    id: "meal",
    title: "Meal Station",
    description: "Breakfast, lunch, and dinner service",
    path: "/meal-station"
  }, {
    id: "drinks",
    title: "Drinks Station", 
    description: "Beverage redemption service",
    path: "/drinks-station"
  }, {
    id: "headphones",
    title: "Headphones Station",
    description: "Silent disco headphone rental for attendees", 
    path: "/headphones-station"
  }, {
    id: "equipment",
    title: "Staff Equipment Hub",
    description: "Staff equipment checkout and management system",
    path: "/equipment-hub"
  }];
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/lovable-uploads/99c12b37-6cab-446c-a8f9-0ede24e2a6f2.png" alt="Melanated Campout" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Melanated Campout 2025</h1>
          <p className="text-muted-foreground mb-2">RFID Management System</p>
          <Badge variant="outline" className="mb-4">Veterans Campground, Cordele, GA • Sep 26-28, 2025</Badge>
        </div>


        {/* Activation Tools */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <Zap className="h-5 w-5" />
            Activation Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/activation")}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">Self-Service Activation</h3>
                <p className="text-sm text-muted-foreground mb-3">Attendees activate their own wristbands using phone numbers</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/activation");
                  }}
                  className="w-full"
                >
                  Access Self-Service
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-secondary/50 bg-secondary/5" onClick={() => navigate("/rfid-assignment")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-5 w-5 text-secondary" />
                  <h3 className="font-semibold text-lg">RFID Assignment</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">Assign RFID tags to attendees using USB scanner</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/rfid-assignment");
                  }}
                  className="w-full border-secondary/30 hover:bg-secondary/10"
                >
                  Access Assignment Station
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50/50" onClick={() => navigate("/staff-hub")}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 text-blue-700">Staff Hub</h3>
                <p className="text-sm text-muted-foreground mb-3">Comprehensive staff tools for activation, deactivation, and management</p>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/staff-hub");
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Access Staff Tools
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Station Operations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <Scan className="h-5 w-5" />
            Station Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stations.map(station => (
              <Card key={station.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{station.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{station.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(station.path)}
                    className="w-full"
                  >
                    Access {station.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Admin Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Admin Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-w-md mx-auto">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 bg-green-50/50" onClick={() => navigate("/reports")}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 text-green-700">Daily Reports Dashboard</h3>
                <p className="text-sm text-muted-foreground mb-3">Real-time check-ins, headphone tracking, and usage analytics</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/reports");
                  }}
                  className="w-full border-green-300 hover:bg-green-100"
                >
                  Access Reports Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Developer Tools */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <Code className="h-5 w-5" />
            Developer Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-w-md mx-auto">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-purple-200 bg-purple-50/50" onClick={() => navigate("/dev")}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 text-purple-700">Developer Dashboard</h3>
                <p className="text-sm text-muted-foreground mb-3">Webhook monitoring, sync history, analytics, and debug tools</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/dev");
                  }}
                  className="w-full border-purple-300 hover:bg-purple-100"
                >
                  Access Developer Tools
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
    </div>;
};
export default Index;