import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Download, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

// The provided RegFox IDs from the user
const PROVIDED_REGFOX_IDS = [
  "65675508", "58281550", "65662747", "65661757", "65257440", "62814503", "65625954", "65624454", 
  "65619193", "65615360", "65613005", "65600522", "65599116", "65554691", "65512984", "65512764",
  "65462146", "65458560", "65440359", "65434183", "64620482", "65414534", "65413209", "65408210",
  "65407054", "63025426", "65403788", "65398018", "62750101", "65372735", "65370670", "58687787",
  "63270977", "65356258", "65328832", "65328522", "65304618", "65294673", "65252257", "65202865",
  "57507836", "65196395", "65185608", "65162189", "65110495", "65109076", "57428910", "57445274",
  "62627174", "57449513", "57789191", "65048413", "65046633", "65000874", "65037141", "65036302",
  "65029137", "65028769", "65017765", "65016995", "65013724", "65013511", "65012237", "63724003",
  "65000289", "64995533", "64987242", "64981058", "64979135", "64971364", "64962517", "64945221",
  "64013437", "64927033", "64926180", "57550080", "63981902", "64871240", "64857362", "64845520",
  "64835064", "64834984", "64792265", "64768532", "64763582", "64763577", "64754318", "64751640",
  "64737078", "64736910", "64720859", "64698324", "64695667", "64661473", "64661293", "64659320",
  "64626307", "64619540", "64613091", "64612897", "64594888", "64594399", "64593841", "64574690",
  "64557299", "64554475", "64553931", "64549427", "64544118", "64541404", "64534316", "64531858",
  "64524797", "64519773", "64518242", "64518158", "63446585", "64490766", "64488809", "64488804",
  "64486197", "64428032", "64388730", "64387007", "64341255", "64328132", "64246618", "64206675",
  "62700043", "64202732", "64186195", "64125411", "64114363", "64047611", "64039983", "64028023",
  "64009312", "63998577", "63982712", "63953899", "63947513", "63944862", "63943101", "63937758",
  "63928431", "63912579", "63911895", "63843656", "63793177", "63791887", "63760840", "63734282",
  "63716827", "60179712", "63705260", "63705245", "63705128", "63704634", "63704435", "63704273",
  "63695422", "63687913", "63682359", "61404218", "63654328", "61616233", "63639097", "63636510",
  "63629895", "63608131", "57534727", "63596609", "58263412", "63499157", "63496830", "63487398",
  "63478074", "63477957", "63471766", "63468710", "57988118", "63438539", "63392664", "63325363",
  "63265194", "63263741", "63260844", "63257725", "63254064", "63241360", "63227783", "63219169",
  "63194570", "63170634", "63165513", "63165178", "63164585", "63164486", "63163606", "63164287",
  "63163108", "63162346", "63130340", "63061414", "63052782", "63025326", "63018975", "63018215",
  "63017154", "63010480", "62993685", "62987621", "62987064", "62962953", "62932821", "62908699",
  "62900945", "62878462", "62811928", "57516856", "62723996", "62688570", "62684853", "62680680",
  "62680548", "62680536", "62675795", "62611153", "62489083", "62597516", "62543611", "62533877",
  "62523498", "62517416", "62517286", "62512516", "62477995", "61526099", "62401034", "62390914",
  "62350140", "62305389", "62227145", "62241770", "62212575", "62180684", "62068122", "62067183",
  "61669862", "61857735", "61742478", "61696758", "61669997", "61669819", "61628674", "61487072",
  "61345811", "60239996", "61177164", "61176591", "61097663", "61048617", "61048002", "61026526",
  "60903161", "60863942", "60834870", "60598608", "60538778", "60499894", "59957906", "59957614",
  "59840504", "59678071", "59604696", "59601334", "59506563", "59394702", "59319119", "59263291",
  "57664234", "59198479", "57470171", "59142212", "59111989", "59096764", "59048052", "59032865",
  "58985233", "58926131", "58924910", "58918030", "58846376", "58842304", "58819015", "58797532",
  "58759113", "58757596", "58690653", "58687207", "58666503", "58620945", "58577135", "58560865",
  "58545368", "58416237", "58374961", "58359777", "58346830", "58340191", "58334580", "58272138",
  "58186268", "58207656", "58046285", "58035917", "58035673", "58024274", "58001263", "57984787",
  "57962591", "57960951", "57880035", "57833727", "57786045", "57786146", "57786140", "57764321",
  "57759641", "57756856", "57755851", "57676814", "57659804", "57659102", "57650618", "57649244",
  "57647605", "57647255", "57646500", "57638296", "57635928", "57624430", "57620994", "57607256",
  "57587494", "57586373", "57586138", "57568448", "57568230", "57553080", "57545815", "57533756",
  "57534537", "57534161", "57533820", "57532829", "57531633", "57530210", "57515412", "57505784",
  "57475171", "57465160", "57465142", "57453942", "57443410", "57442389", "57433335", "57423632",
  "57440057", "57439585", "57437718", "57436692", "57436348", "57436019", "57433046", "57432598",
  "57432152", "57429905", "57429448", "57429439", "57429001", "57428979", "57427744", "57428786",
  "57426891", "57427407", "57426510", "57425911", "57425227", "57424886", "57423589", "57423398",
  "57423323", "57423153", "57423067", "57422954", "57422866", "57407070"
];

interface AnalysisResult {
  provided_count: number;
  database_count: number;
  missing_from_db_count: number;
  extra_in_db_count: number;
  missing_from_db: string[];
  extra_in_db: string[];
  missing_details: Array<{
    regfox_id: string;
    display_id: string;
    order_id: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
    amount: number;
    date_created: string;
    date_updated: string;
  }>;
  missing_by_order: Array<{
    order_id: string;
    missing_count: number;
    registrants: any[];
  }>;
  total_fetched_from_regfox: number;
}

export const RegFoxMissingAnalysis: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('regfox-missing-analysis', {
        body: { providedRegfoxIds: PROVIDED_REGFOX_IDS }
      });

      if (error) {
        console.error('Analysis function error:', error);
        toast.error(`Analysis error: ${error.message}`);
        return;
      }

      if (!data.success) {
        toast.error(`Analysis failed: ${data.error}`);
        return;
      }

      setAnalysisResult(data.analysis);
      toast.success(`Analysis complete! Found ${data.analysis.missing_from_db_count} missing registrations.`);
      
    } catch (error) {
      console.error('Error calling analysis function:', error);
      toast.error('Failed to analyze RegFox registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMissing = () => {
    if (!analysisResult) return;

    const csvContent = [
      'RegFox ID,Display ID,Order ID,First Name,Last Name,Email,Phone,Status,Amount,Date Created',
      ...analysisResult.missing_details.map(reg => 
        `${reg.regfox_id},${reg.display_id || ''},${reg.order_id || ''},${reg.first_name},${reg.last_name},${reg.email},${reg.phone},${reg.status},${reg.amount || 0},${reg.date_created}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `regfox-missing-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Missing registrations exported to CSV');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          RegFox Missing Registration Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {isLoading ? 'Analyzing...' : 'Analyze Missing Registrations'}
          </Button>
          
          {analysisResult && analysisResult.missing_details.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleExportMissing}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Missing ({analysisResult.missing_from_db_count})
            </Button>
          )}
        </div>

        {analysisResult && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{analysisResult.provided_count}</div>
                <div className="text-sm text-muted-foreground">Provided IDs</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analysisResult.database_count}</div>
                <div className="text-sm text-muted-foreground">In Database</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-destructive">{analysisResult.missing_from_db_count}</div>
                <div className="text-sm text-muted-foreground">Missing from DB</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{analysisResult.extra_in_db_count}</div>
                <div className="text-sm text-muted-foreground">Extra in DB</div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {analysisResult.missing_from_db_count === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">All provided registrations are in the database!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-destructive font-medium">
                    {analysisResult.missing_from_db_count} registration{analysisResult.missing_from_db_count > 1 ? 's' : ''} missing from database
                  </span>
                </>
              )}
            </div>

            {/* Missing by Order */}
            {analysisResult.missing_by_order.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Missing Registrations by Order
                </h3>
                <ScrollArea className="h-96 border rounded-lg">
                  <div className="p-4 space-y-4">
                    {analysisResult.missing_by_order.map((order, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            Order: {order.order_id === 'NO_ORDER' ? 'No Order ID' : order.order_id}
                          </div>
                          <Badge variant="destructive">{order.missing_count} missing</Badge>
                        </div>
                        <div className="grid gap-2">
                          {order.registrants.map((reg: any, regIndex: number) => (
                            <div key={regIndex} className="text-sm p-2 bg-muted rounded border-l-4 border-l-destructive">
                              <div className="font-medium">{reg.first_name} {reg.last_name}</div>
                              <div className="text-muted-foreground">
                                RegFox ID: {reg.regfox_id} | Email: {reg.email}
                              </div>
                              <div className="text-muted-foreground">
                                Status: {reg.status} | Amount: ${reg.amount || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                        {index < analysisResult.missing_by_order.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};