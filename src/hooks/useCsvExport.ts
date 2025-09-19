import { useCallback } from 'react';
import { AttendeeData } from '@/pages/RfidAssignment';
import { formatPhoneNumber } from '@/lib/phoneUtils';

export const useCsvExport = () => {
  const exportToCsv = useCallback((
    attendees: AttendeeData[],
    filename: string = 'rfid-assignment-export'
  ) => {
    const headers = [
      'Name',
      'Phone', 
      'Email',
      'Order ID',
      'Ticket Type',
      'Meal Plan',
      'Arrival Day',
      'RFID UID',
      'RFID Status',
      'Overall Status',
      'Activated At',
      'Waiver Signed',
      'Created At'
    ];

    const csvContent = [
      headers.join(','),
      ...attendees.map(attendee => [
        `"${attendee.first_name} ${attendee.last_name}"`,
        `"${attendee.phone ? formatPhoneNumber(attendee.phone) : 'N/A'}"`,
        `"${attendee.email || 'N/A'}"`,
        `"${attendee.order_id || 'No Order'}"`,
        `"${attendee.ticket_type}"`,
        `"${attendee.formatted_meal_plan || 'No Plan'}"`,
        `"${attendee.arrival_day || 'Friday'}"`,
        `"${attendee.rfid_uid || 'Unassigned'}"`,
        `"${attendee.rfid_status || 'unissued'}"`,
        `"${attendee.overall_status || 'unassigned'}"`,
        `"${attendee.activated_at ? new Date(attendee.activated_at).toLocaleString() : 'Not Activated'}"`,
        `"${attendee.waiver_signed ? 'Signed' : 'Pending'}"`,
        `"${new Date(attendee.created_at).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return { exportToCsv };
};