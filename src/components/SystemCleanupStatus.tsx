import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";

export const SystemCleanupStatus = () => {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg text-primary flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          System Cleanup Complete
        </CardTitle>
        <CardDescription>
          Your system has been cleaned and prepared for production use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Completed Tasks:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Badge variant="secondary" className="justify-start">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              Mock data cleared
            </Badge>
            <Badge variant="secondary" className="justify-start">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              RFID tags reset
            </Badge>
            <Badge variant="secondary" className="justify-start">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              RLS policies fixed
            </Badge>
            <Badge variant="secondary" className="justify-start">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              Edge functions updated
            </Badge>
            <Badge variant="secondary" className="justify-start">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              Error logs cleared
            </Badge>
            <Badge variant="secondary" className="justify-start">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              Security functions fixed
            </Badge>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Action Required
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Please upgrade your PostgreSQL version in the Supabase dashboard to apply security patches.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Your RegFox sync is now configured to use the real RegFox API instead of mock data.
          The system is ready for production use.
        </div>
      </CardContent>
    </Card>
  );
};