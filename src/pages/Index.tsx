import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCheck, Scan, ShoppingCart, Users, Settings, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
const Index = () => {
  const navigate = useNavigate();
  const roles = [{
    id: "admin",
    title: "Admin",
    description: "Full system access, reports, and user management",
    icon: Shield,
    color: "bg-primary text-primary-foreground",
    path: "/dashboard"
  }, {
    id: "ranger",
    title: "Ranger",
    description: "Gate access control and security scanning",
    icon: Radio,
    color: "bg-secondary text-secondary-foreground",
    path: "/ranger"
  }, {
    id: "system",
    title: "System Validation",
    description: "Pre-event testing and system validation",
    icon: Settings,
    color: "bg-accent text-accent-foreground",
    path: "/system-validation"
  }, {
    id: "vendor",
    title: "Vendor",
    description: "Verify attendee eligibility for services",
    icon: ShoppingCart,
    color: "bg-muted text-muted-foreground",
    path: "/vendor"
  }];

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
    description: "Silent disco equipment checkout",
    path: "/headphones-station"
  }, {
    id: "activation",
    title: "Activation Station",
    description: "RFID activation and deactivation",
    path: "/activation"
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

        {/* Role Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <Users className="h-5 w-8" />
            Select Your Role
          </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map(role => {
            const Icon = role.icon;
            return <Card key={role.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 rounded-full ${role.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="mb-4">{role.description}</CardDescription>
                    <Button variant="outline" size="sm" onClick={() => {
                      if (role.id === 'admin') {
                        navigate("/auth", { state: { role: role.id } });
                      } else {
                        navigate(role.path);
                      }
                    }} className="w-full">
                      Continue as {role.title}
                    </Button>
                  </CardContent>
                </Card>;
          })}
          </div>
        </div>

        {/* Station Operations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
            <Scan className="h-5 w-5" />
            Station Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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


        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Need help? Contact event staff for assistance.</p>
        </div>
      </div>
    </div>;
};
export default Index;