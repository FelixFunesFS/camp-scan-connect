import { supabase } from "@/integrations/supabase/client";

export interface AdminRequest {
  id?: string;
  title: string;
  description?: string;
  task_type: 'feature_request' | 'bug_fix' | 'improvement' | 'maintenance';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'open' | 'in_progress' | 'paused' | 'testing' | 'completed' | 'cancelled';
  category?: string;
  assigned_to?: string;
  created_by?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class AdminRequestService {
  static async createRequest(request: Omit<AdminRequest, 'id' | 'created_at' | 'updated_at'>): Promise<AdminRequest> {
    try {
      console.log('Creating admin request:', request);
      
      const { data, error } = await (supabase.from as any)('admin_tasks')
        .insert([{
          ...request,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating admin task:', error);
        throw error;
      }

      console.log('Admin task created successfully:', data);
      return data as AdminRequest;
    } catch (error) {
      console.error('Failed to create admin task:', error);
      throw error;
    }
  }

  static async getAllRequests(): Promise<AdminRequest[]> {
    try {
      const { data, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin tasks:', error);
        throw error;
      }

      return (data as AdminRequest[]) || [];
    } catch (error) {
      console.error('Failed to fetch admin tasks:', error);
      throw error;
    }
  }

  static async getRequestsByStatus(status: AdminRequest['status'][]): Promise<AdminRequest[]> {
    try {
      const { data, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .in('status', status)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks by status:', error);
        throw error;
      }

      return (data as AdminRequest[]) || [];
    } catch (error) {
      console.error('Failed to fetch tasks by status:', error);
      throw error;
    }
  }

  static async updateRequest(id: string, updates: Partial<AdminRequest>): Promise<void> {
    try {
      const updateData: any = { ...updates };
      
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('admin_tasks')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating admin task:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update admin task:', error);
      throw error;
    }
  }

  static async deleteRequest(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting admin task:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete admin task:', error);
      throw error;
    }
  }

  static async getRequestStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    paused: number;
    completed: number;
    urgent: number;
  }> {
    try {
      const { data: tasks, error } = await supabase
        .from('admin_tasks')
        .select('status, priority');

      if (error) {
        console.error('Error fetching task stats:', error);
        throw error;
      }

      const stats = {
        total: tasks?.length || 0,
        open: tasks?.filter(t => t.status === 'open').length || 0,
        inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        paused: tasks?.filter(t => t.status === 'paused').length || 0,
        completed: tasks?.filter(t => t.status === 'completed').length || 0,
        urgent: tasks?.filter(t => t.priority === 'urgent').length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Failed to fetch task stats:', error);
      return { total: 0, open: 0, inProgress: 0, paused: 0, completed: 0, urgent: 0 };
    }
  }
}