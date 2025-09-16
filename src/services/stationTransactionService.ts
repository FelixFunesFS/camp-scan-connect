import { supabase } from "@/integrations/supabase/client";
import { StationTransaction, StationType, TransactionType } from "@/types/station";

export class StationTransactionService {
  static async recordTransaction(transaction: StationTransaction) {
    const { error } = await supabase
      .from("station_transactions")
      .insert(transaction);

    if (error) {
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  }

  static async getDailyCount(
    attendeeId: string, 
    stationType: StationType, 
    transactionTypes?: TransactionType[]
  ): Promise<number> {
    let query = supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", attendeeId)
      .eq("station_type", stationType)
      .gte("created_at", new Date().toISOString().split('T')[0]);

    if (transactionTypes) {
      query = query.in("transaction_type", transactionTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading transaction count:", error);
      return 0;
    }

    return data.length;
  }

  static async getLatestStatus(
    attendeeId: string, 
    stationType: StationType, 
    statusField: string = 'current_status'
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("station_transactions")
      .select("*")
      .eq("attendee_id", attendeeId)
      .eq("station_type", stationType)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading latest status:", error);
      return null;
    }

    return data.length > 0 ? data[0][statusField] || data[0].transaction_type : null;
  }
}