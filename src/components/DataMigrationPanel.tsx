import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Database, RefreshCw, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MigrationResult {
  success: boolean;
  migration: {
    attendees_processed: number;
    attendees_migrated: number;
    details: Array<{
      id: string;
      status: 'success' | 'error';
      error?: string;
      extracted?: {
        emergencyContactName?: string;
        emergencyContactPhone?: string;
      };
    }>;
  };
  completeness_report: {
    total_attendees: number;
    statistics: {
      address: Record<string, number>;
      demographics: Record<string, number>;
      preferences: Record<string, number>;
      emergency: Record<string, number>;
      custom_fields: number;
    };
    percentages: {
      address: Record<string, number>;
      demographics: Record<string, number>;
      preferences: Record<string, number>;
      emergency: Record<string, number>;
      custom_fields: number;
    };
  };
  recommendations: string[];
}

export function DataMigrationPanel() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      
      const { data, error } = await supabase.functions.invoke('data-migration');
      
      if (error) throw error;
      
      setMigrationResult(data);
      
      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${data.migration.attendees_migrated} attendees`,
      });
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleFullResync = async () => {
    try {
      setIsResyncing(true);
      
      const { data, error } = await supabase.functions.invoke('regfox-sync');
      
      if (error) throw error;
      
      toast({
        title: "Re-sync Complete",
        description: `Synced ${data.result.totalRecords} records from RegFox`,
      });
      
      // Refresh migration result after re-sync
      await handleMigration();
    } catch (error) {
      console.error('Re-sync error:', error);
      toast({
        title: "Re-sync Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  const renderCompletenessSection = (
    title: string, 
    data: Record<string, number>, 
    percentages: Record<string, number>,
    icon: React.ReactNode
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-medium">{title}</h4>
      </div>
      <div className="space-y-2">
        {Object.entries(data).map(([field, count]) => {
          const percentage = percentages[field] || 0;
          const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          return (
            <div key={field} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{fieldLabel}</span>
                <span className="text-muted-foreground">{count} ({percentage}%)</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Phase 3: Data Migration & Validation
        </CardTitle>
        <CardDescription>
          Migrate existing data to new fields and validate completeness
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Migration Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={handleMigration} 
            disabled={isMigrating}
            className="flex items-center gap-2"
          >
            {isMigrating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isMigrating ? 'Migrating...' : 'Migrate Existing Data'}
          </Button>
          
          <Button 
            onClick={handleFullResync} 
            disabled={isResyncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isResyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isResyncing ? 'Re-syncing...' : 'Full RegFox Re-sync'}
          </Button>
        </div>

        {/* Migration Results */}
        {migrationResult && (
          <div className="space-y-4">
            {migrationResult.success ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Migration Successful</AlertTitle>
                <AlertDescription>
                  Processed {migrationResult.migration.attendees_processed} attendees, 
                  migrated {migrationResult.migration.attendees_migrated} emergency contacts
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Migration Failed</AlertTitle>
                <AlertDescription>
                  Please check the logs and try again
                </AlertDescription>
              </Alert>
            )}

            {/* Data Completeness Report */}
            {migrationResult.completeness_report && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Data Completeness Report
                  </CardTitle>
                  <CardDescription>
                    Total Attendees: {migrationResult.completeness_report.total_attendees}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Address Information */}
                  {renderCompletenessSection(
                    "Address Information",
                    migrationResult.completeness_report.statistics.address,
                    migrationResult.completeness_report.percentages.address,
                    <Badge variant="outline">📍</Badge>
                  )}

                  {/* Demographics */}
                  {renderCompletenessSection(
                    "Demographics",
                    migrationResult.completeness_report.statistics.demographics,
                    migrationResult.completeness_report.percentages.demographics,
                    <Badge variant="outline">👤</Badge>
                  )}

                  {/* Event Preferences */}
                  {renderCompletenessSection(
                    "Event Preferences",
                    migrationResult.completeness_report.statistics.preferences,
                    migrationResult.completeness_report.percentages.preferences,
                    <Badge variant="outline">⚙️</Badge>
                  )}

                  {/* Emergency Contacts */}
                  {renderCompletenessSection(
                    "Emergency Contacts",
                    migrationResult.completeness_report.statistics.emergency,
                    migrationResult.completeness_report.percentages.emergency,
                    <Badge variant="outline">🚨</Badge>
                  )}

                  {/* Custom Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">🔧</Badge>
                      <h4 className="font-medium">Custom Fields</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Attendees with Custom Data</span>
                        <span className="text-muted-foreground">
                          {migrationResult.completeness_report.statistics.custom_fields} 
                          ({migrationResult.completeness_report.percentages.custom_fields}%)
                        </span>
                      </div>
                      <Progress 
                        value={migrationResult.completeness_report.percentages.custom_fields} 
                        className="h-2" 
                      />
                    </div>
                  </div>

                  {/* Recommendations */}
                  {migrationResult.recommendations.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Recommendations</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          {migrationResult.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}