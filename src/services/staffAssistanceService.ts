import { supabase } from "@/integrations/supabase/client";

export interface StaffAssistanceRequest {
  id?: string;
  phone_number?: string;
  attendee_name?: string;
  email?: string;
  issue_type: 'not_found' | 'unassigned' | 'activation_failed' | 'system_error';
  error_message?: string;
  contact_info?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at?: string;
  assigned_staff_id?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export class StaffAssistanceService {
  static async createAssistanceRequest(request: Omit<StaffAssistanceRequest, 'id' | 'created_at' | 'status'>): Promise<StaffAssistanceRequest> {
    try {
      console.log('Creating staff assistance request:', request);
      
      const { data, error } = await supabase
        .from('staff_assistance_requests')
        .insert([{
          ...request,
          status: 'open',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating assistance request:', error);
        throw error;
      }

      console.log('Staff assistance request created successfully:', data);
      return data as StaffAssistanceRequest;
    } catch (error) {
      console.error('Failed to create staff assistance request:', error);
      throw error;
    }
  }

  static async getOpenRequests(): Promise<StaffAssistanceRequest[]> {
    try {
      const { data, error } = await supabase
        .from('staff_assistance_requests')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assistance requests:', error);
        throw error;
      }

      return (data as StaffAssistanceRequest[]) || [];
    } catch (error) {
      console.error('Failed to fetch assistance requests:', error);
      throw error;
    }
  }

  static async updateRequestStatus(id: string, status: StaffAssistanceRequest['status'], resolution_notes?: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      if (resolution_notes) {
        updateData.resolution_notes = resolution_notes;
      }

      const { error } = await supabase
        .from('staff_assistance_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating assistance request:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update assistance request:', error);
      throw error;
    }
  }
}