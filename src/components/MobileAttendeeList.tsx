import React, { useState, useCallback } from "react";
import { MobileRfidAssignmentCard } from "@/components/MobileRfidAssignmentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Users, Loader2 } from "lucide-react";
import type { AttendeeData } from "@/pages/RfidAssignment";

interface MobileAttendeeListProps {
  attendees: AttendeeData[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAssignmentComplete?: () => void;
  onOptimisticUpdate?: (attendeeId: string, rfidUid: string | null, rfidStatus: string) => void;
}

export const MobileAttendeeList: React.FC<MobileAttendeeListProps> = ({
  attendees,
  loading,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onAssignmentComplete,
  onOptimisticUpdate
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (currentPage >= totalPages || isLoadingMore) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      onPageChange(currentPage + 1);
      setIsLoadingMore(false);
    }, 300);
  }, [currentPage, totalPages, isLoadingMore, onPageChange]);

  if (loading && attendees.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="mobile-card">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
                <div className="h-6 w-20 bg-muted rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <Card>
        <CardContent className="mobile-card text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No attendees found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search or filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {attendees.length} of {totalCount} attendees</span>
        {totalPages > 1 && (
          <Badge variant="outline" className="text-xs">
            Page {currentPage} of {totalPages}
          </Badge>
        )}
      </div>

      {/* Attendee Cards */}
      <div className="space-y-3">
        {attendees.map((attendee) => (
          <MobileRfidAssignmentCard
            key={attendee.id}
            attendee={attendee}
            onAssignmentComplete={onAssignmentComplete}
            onOptimisticUpdate={onOptimisticUpdate}
          />
        ))}
      </div>

      {/* Load More Button */}
      {currentPage < totalPages && (
        <div className="pt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="w-full touch-target"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load More ({totalPages - currentPage} pages remaining)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Bottom Spacing for Floating Elements */}
      <div className="h-20" />
    </div>
  );
};