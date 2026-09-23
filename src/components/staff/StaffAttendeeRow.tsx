import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronRight,
  UserCheck,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Shirt,
} from "lucide-react";
import { formatTicketType } from "@/lib/ticketTypes";
import { getStatusClassName } from "@/lib/registrationStatus";
import {
  getRegistrationStatusVariant,
  getRegistrationStatusDisplayText,
} from "@/utils/statusUtils";
import { HeadphonesStatusService } from "@/services/headphonesStatusService";
import { EquipmentStatusService } from "@/services/equipmentStatusService";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import type { EnhancedAttendee } from "@/components/StaffActivationHub";

interface EquipmentLine {
  label: string;
  status?: "checked_out" | "checked_in" | "never_used";
  duration?: number;
  longAfter: number;
  format: (minutes: number) => string;
}

function equipmentLines(attendee: EnhancedAttendee): EquipmentLine[] {
  return [
    {
      label: "Headphones",
      status: attendee.headphones_status,
      duration: attendee.headphones_duration,
      longAfter: 180,
      format: (m) => HeadphonesStatusService.formatCheckoutDuration(m),
    },
    {
      label: "Golf cart",
      status: attendee.golf_cart_status,
      duration: attendee.golf_cart_duration,
      longAfter: 480,
      format: (m) => EquipmentStatusService.formatUsageTime(m),
    },
    {
      label: "Walkie talkie",
      status: attendee.walkie_talkie_status,
      duration: attendee.walkie_talkie_duration,
      longAfter: 480,
      format: (m) => EquipmentStatusService.formatUsageTime(m),
    },
    {
      label: "Fanny pack",
      status: attendee.fanny_pack_status,
      duration: attendee.fanny_pack_duration,
      longAfter: 1440,
      format: (m) => EquipmentStatusService.formatUsageTime(m),
    },
  ];
}

function EquipmentBadge({ line }: { line: EquipmentLine }) {
  if (line.status === "checked_out") {
    const duration = line.duration || 0;
    return (
      <Badge variant={duration > line.longAfter ? "destructive" : "secondary"} className="text-xs">
        {line.label} · {line.format(duration)}
      </Badge>
    );
  }
  if (line.status === "checked_in") {
    return (
      <Badge variant="outline" className="text-xs">
        {line.label} returned
      </Badge>
    );
  }
  return null;
}

function DetailItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-words min-w-0">
        {value || <span className="text-muted-foreground font-normal">—</span>}
      </span>
    </div>
  );
}

interface StaffAttendeeRowProps {
  attendee: EnhancedAttendee;
  allAttendees: EnhancedAttendee[];
  expanded: boolean;
  onToggle: () => void;
  onActivate: (attendeeId: string) => void;
  onGroupActivate: (attendees: EnhancedAttendee[]) => void;
}

export function StaffAttendeeRow({
  attendee,
  allAttendees,
  expanded,
  onToggle,
  onActivate,
  onGroupActivate,
}: StaffAttendeeRowProps) {
  const lines = equipmentLines(attendee);
  const activeEquipment = lines.filter((l) => l.status === "checked_out");
  const summary = attendee.tshirt_summary;
  const orders = attendee.tshirt_orders || [];

  const credentialBadge = attendee.activated_at ? (
    <Badge className="text-xs">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Active band
    </Badge>
  ) : attendee.rfid_uid ? (
    <Badge variant="secondary" className="text-xs">
      <Clock className="h-3 w-3 mr-1" />
      Assigned
    </Badge>
  ) : (
    <Badge variant="destructive" className="text-xs">
      <AlertTriangle className="h-3 w-3 mr-1" />
      No band
    </Badge>
  );

  const tshirtLabel = !summary?.hasAnyTShirt
    ? null
    : summary.totalPickedUp === summary.totalOrders
      ? `T-shirts picked up (${summary.totalOrders})`
      : summary.totalPickedUp > 0
        ? `T-shirts ${summary.totalPickedUp}/${summary.totalOrders}`
        : `T-shirts pending (${summary.totalOrders})`;

  return (
    <Card className="overflow-hidden">
      {/* Summary row */}
      <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:gap-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex flex-1 min-w-0 items-start gap-2 text-left"
        >
          <span className="mt-0.5 text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold truncate">
                {attendee.first_name} {attendee.last_name}
              </span>
              {attendee.is_veteran && (
                <Badge variant="outline" className="text-[10px]">
                  Veteran
                </Badge>
              )}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground truncate">
              {formatTicketType(attendee.ticket_type)}
              {attendee.order_id ? ` · #${attendee.order_id}` : ""}
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Badge
            variant={getRegistrationStatusVariant(attendee.registration_status)}
            className={`text-xs ${getStatusClassName(attendee.registration_status)}`}
          >
            {getRegistrationStatusDisplayText(attendee.registration_status)}
          </Badge>
          {credentialBadge}
          {activeEquipment.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeEquipment.length} item{activeEquipment.length !== 1 ? "s" : ""} out
            </Badge>
          )}
          {tshirtLabel && (
            <Badge variant="outline" className="text-xs">
              <Shirt className="h-3 w-3 mr-1" />
              {tshirtLabel}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 lg:shrink-0">
          {attendee.rfid_uid && !attendee.activated_at && (
            <Button size="sm" className="h-9 flex-1 lg:flex-none" onClick={() => onActivate(attendee.id)}>
              <UserCheck className="h-4 w-4 mr-1" />
              Activate
            </Button>
          )}
          {attendee.is_group_order && attendee.order_id && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 flex-1 lg:flex-none"
              onClick={() =>
                onGroupActivate(allAttendees.filter((a) => a.order_id === attendee.order_id))
              }
            >
              <Users className="h-4 w-4 mr-1" />
              Group
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t bg-muted/20 p-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Camper &amp; contact
              </p>
              <DetailItem
                label="Phone"
                value={
                  attendee.phone ? (
                    <a href={`tel:${attendee.phone}`} className="inline-flex items-center gap-1 underline">
                      <Phone className="h-3 w-3" />
                      {attendee.phone}
                    </a>
                  ) : undefined
                }
              />
              <DetailItem
                label="Email"
                value={
                  attendee.email ? (
                    <a href={`mailto:${attendee.email}`} className="inline-flex items-center gap-1 underline break-all">
                      <Mail className="h-3 w-3 shrink-0" />
                      {attendee.email}
                    </a>
                  ) : undefined
                }
              />
              <DetailItem label="Order" value={attendee.order_id} />
              <DetailItem label="Ticket" value={formatTicketType(attendee.ticket_type)} />
              <DetailItem
                label="Location"
                value={
                  attendee.city || attendee.state ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[attendee.city, attendee.state].filter(Boolean).join(", ")}
                    </span>
                  ) : undefined
                }
              />
              <DetailItem label="Arrival" value={attendee.arrival_day} />
              <DetailItem label="Meal plan" value={attendee.meal_plan || "No meal plan"} />
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Credential &amp; waiver
              </p>
              <DetailItem
                label="Band code"
                value={attendee.rfid_uid ? <span className="font-mono">{attendee.rfid_uid}</span> : undefined}
              />
              <DetailItem label="Band status" value={attendee.rfid_status} />
              <DetailItem
                label="Activated"
                value={attendee.activated_at ? new Date(attendee.activated_at).toLocaleString() : "Not activated"}
              />
              <DetailItem label="Waiver" value={attendee.waiver_signed ? "Signed" : "Not signed"} />
              <DetailItem
                label="Registration"
                value={getRegistrationStatusDisplayText(attendee.registration_status)}
              />
              <DetailItem label="Veteran" value={attendee.is_veteran ? "Yes" : "No"} />
              <DetailItem label="Group order" value={attendee.is_group_order ? `Yes (${attendee.group_size ?? "—"})` : "No"} />
            </div>

            <div className="rounded-lg border bg-background p-3 md:col-span-2 xl:col-span-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Equipment &amp; stations
              </p>
              {lines.map((line) => (
                <DetailItem
                  key={line.label}
                  label={line.label}
                  value={
                    line.status === "checked_out"
                      ? `Checked out · ${line.format(line.duration || 0)}`
                      : line.status === "checked_in"
                        ? "Returned"
                        : "Never used"
                  }
                />
              ))}
              <DetailItem
                label="T-shirts"
                value={
                  !summary?.hasAnyTShirt
                    ? "None ordered"
                    : `${summary.totalPickedUp}/${summary.totalOrders} picked up`
                }
              />
              {orders.length > 0 && (
                <div className="mt-2 space-y-1">
                  {orders.map((order) => (
                    <p key={order.id} className="text-xs">
                      <span className={order.isPickedUp ? "text-green-600" : "text-muted-foreground"}>
                        {order.isPickedUp ? "✓" : "○"} {order.style} {order.size} × {order.quantity}
                      </span>
                    </p>
                  ))}
                </div>
              )}
              {attendee.special_accommodations && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Notes: {attendee.special_accommodations}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <AttendeeDetailModal
              attendee={attendee}
              allAttendees={allAttendees}
              onActivate={onActivate}
              onGroupActivate={onGroupActivate}
              trigger={
                <Button size="sm" variant="outline" className="h-9">
                  Open full profile
                </Button>
              }
            />
          </div>
        </div>
      )}
    </Card>
  );
}
