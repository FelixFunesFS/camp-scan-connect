import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, CheckCircle2, Users, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { EnhancedActivationService, UnifiedSearchResult } from "@/services/enhancedActivationService";
import { PhoneActivationService, GroupActivationResult } from "@/services/phoneActivationService";

interface StaffAssistedActivationPanelProps {
  onActivationSuccess: (result: GroupActivationResult) => void;
  onCancel: () => void;
  stationName?: string;
}

export function StaffAssistedActivationPanel({ 
  onActivationSuccess, 
  onCancel,
  stationName = "Station"
}: StaffAssistedActivationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [searchResult, setSearchResult] = useState<UnifiedSearchResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a phone number, name, email, or order ID");
      return;
    }

    setIsSearching(true);
    setError("");
    setSearchResult(null);

    try {
      const result = await EnhancedActivationService.unifiedSearch(searchQuery.trim());
      
      if (!result || result.attendee_count === 0) {
        setError("No attendees found matching your search");
        return;
      }

      setSearchResult(result);
    } catch (error) {
      console.error("Search error:", error);
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleActivation = async () => {
    if (!searchResult) return;

    setIsActivating(true);
    setError("");

    try {
      let result: GroupActivationResult;

      if (searchResult.searchType === 'phone') {
        // Use phone activation for phone searches
        result = await PhoneActivationService.activateGroupByPhone(
          searchResult.primary_phone || searchQuery,
          'staff_assisted'
        ) || { order_id: '', total_attendees: 0, activated_count: 0, already_active_count: 0, attendee_details: [] };
      } else {
        // Use enhanced activation service for other search types
        result = await EnhancedActivationService.activateSearchGroup(searchResult, 'staff');
      }

      if (result.activated_count > 0 || result.already_active_count > 0) {
        toast.success(`Successfully activated ${result.activated_count} attendee(s)!`);
        onActivationSuccess(result);
      } else {
        setError("No attendees were activated. They may already be active or have other issues.");
      }
    } catch (error) {
      console.error("Activation error:", error);
      setError(error instanceof Error ? error.message : "Activation failed. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'name': return <User className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Staff-Assisted Activation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help activate attendees at {stationName} by searching for their registration
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium">
            Search by phone, name, email, or order ID
          </label>
          <div className="flex gap-2">
            <Input
              id="search"
              placeholder="Enter phone number, name, email, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching || isActivating}
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching || isActivating || !searchQuery.trim()}
              size="sm"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchResult && (
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getSearchTypeIcon(searchResult.searchType)}
                <Badge variant="outline" className="capitalize">
                  {searchResult.searchType} Search
                </Badge>
                <Badge variant="secondary">
                  {searchResult.attendee_count} attendee{searchResult.attendee_count !== 1 ? 's' : ''} found
                </Badge>
              </div>
              
              {searchResult.has_group_order && (
                <p className="text-xs text-muted-foreground mb-2">
                  Group order: {searchResult.order_id}
                </p>
              )}

              <div className="space-y-1">
                {searchResult.attendee_details.slice(0, 3).map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{attendee.first_name} {attendee.last_name}</span>
                    <Badge 
                      variant={attendee.activated_at ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {attendee.activated_at ? "Active" : "Needs Activation"}
                    </Badge>
                  </div>
                ))}
                {searchResult.attendee_count > 3 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {searchResult.attendee_count - 3} more
                  </p>
                )}
              </div>
            </div>

            {/* Activation Button */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-medium">Ready to activate?</p>
                <p className="text-xs text-muted-foreground">
                  This will activate all attendees in this group as "staff assisted"
                </p>
              </div>
              <Button 
                onClick={handleActivation}
                disabled={isActivating}
                className="ml-4"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Activate Group
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onCancel} disabled={isSearching || isActivating}>
            Cancel
          </Button>
        </div>

        {/* Usage Tips */}
        <Alert>
          <Search className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Search Tips:</strong> Enter phone numbers with or without formatting (555-123-4567 or 5551234567), 
            full names (John Smith), email addresses, or order IDs.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}