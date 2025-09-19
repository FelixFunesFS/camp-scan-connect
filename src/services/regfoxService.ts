export interface RegFoxTotals {
  total_attendees: number;
  ticket_breakdown: {
    dry_site: number;
    glamping: number;
    cabin: number;
    rv_site: number;
  };
  last_updated: string;
}

export interface DatabaseTotals {
  total_attendees: number;
  unique_orders: number;
  with_order_ids: number;
  ticket_breakdown: {
    dry_site: number;
    glamping: number;
    cabin: number;
    rv_site: number;
  };
  activated_count: number;
  with_rfid: number;
  last_sync: string | null;
}

export interface TotalsComparison {
  database: DatabaseTotals;
  regfox?: RegFoxTotals;
  discrepancies: {
    total_difference: number;
    ticket_differences: {
      dry_site: number;
      glamping: number;
      cabin: number;
      rv_site: number;
    };
  };
  sync_needed: boolean;
}

export class RegFoxService {
  private baseUrl = 'https://api.regfox.com/v2';
  
  async getRegFoxTotals(apiKey: string, formId: string): Promise<RegFoxTotals | null> {
    try {
      // Use the correct WebConnex API endpoint
      const response = await fetch(`https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(formId)}&limit=1000&sort=desc`, {
        headers: {
          'apiKey': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch RegFox data:', response.statusText);
        return null;
      }

      const data = await response.json();
      
      // Process the data to match our ticket types
      const ticketBreakdown = {
        dry_site: 0,
        glamping: 0,
        cabin: 0,
        rv_site: 0
      };

      // Count registrants by ticket type from fieldData
      data.data?.forEach((registrant: any) => {
        // Look for ticket type in fieldData
        const ticketField = registrant.fieldData?.find((field: any) => 
          field.label?.toLowerCase().includes('ticket') || 
          field.path?.toLowerCase().includes('ticket') ||
          field.label?.toLowerCase().includes('site') ||
          field.path?.toLowerCase().includes('site')
        );
        
        if (ticketField && ticketField.value) {
          const ticketType = ticketField.value.toLowerCase();
          if (ticketType.includes('dry') || ticketType.includes('tent')) {
            ticketBreakdown.dry_site++;
          } else if (ticketType.includes('glamping')) {
            ticketBreakdown.glamping++;
          } else if (ticketType.includes('cabin')) {
            ticketBreakdown.cabin++;
          } else if (ticketType.includes('rv')) {
            ticketBreakdown.rv_site++;
          } else {
            // Default to dry_site if unclear
            ticketBreakdown.dry_site++;
          }
        } else {
          // Default to dry_site if no ticket info found
          ticketBreakdown.dry_site++;
        }
      });

      return {
        total_attendees: data.data?.length || 0,
        ticket_breakdown: ticketBreakdown,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching RegFox totals:', error);
      return null;
    }
  }
}

export const regfoxService = new RegFoxService();