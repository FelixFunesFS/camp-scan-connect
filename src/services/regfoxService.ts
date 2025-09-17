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
      const response = await fetch(`${this.baseUrl}/forms/${formId}/registrants`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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

      // Count registrants by ticket type (this will depend on RegFox's actual structure)
      data.registrants?.forEach((registrant: any) => {
        const ticketType = registrant.ticketType || registrant.ticket_type;
        if (ticketType) {
          const normalizedType = ticketType.toLowerCase().replace(/\s+/g, '_');
          if (normalizedType.includes('dry') || normalizedType.includes('tent')) {
            ticketBreakdown.dry_site++;
          } else if (normalizedType.includes('glamping')) {
            ticketBreakdown.glamping++;
          } else if (normalizedType.includes('cabin')) {
            ticketBreakdown.cabin++;
          } else if (normalizedType.includes('rv')) {
            ticketBreakdown.rv_site++;
          }
        }
      });

      return {
        total_attendees: data.registrants?.length || 0,
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