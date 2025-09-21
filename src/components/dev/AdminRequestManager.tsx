import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Calendar, Circle, PlayCircle, CheckCircle2, Pencil, Bug, Wrench, Settings, AlertTriangle, Clock } from 'lucide-react';
import { AdminRequestService, AdminRequest } from '@/services/adminRequestService';

const AdminRequestManager = () => {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');

  // New request form state
  const [newRequest, setNewRequest] = useState<Partial<AdminRequest>>({
    title: '',
    description: '',
    task_type: 'feature_request',
    priority: 'normal',
    category: ''
  });

  // Edit request form state
  const [editRequest, setEditRequest] = useState<Partial<AdminRequest>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requestsData = await AdminRequestService.getAllRequests();
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequest.title?.trim()) {
      toast.error('Request title is required');
      return;
    }

    try {
      await AdminRequestService.createRequest(newRequest as AdminRequest);
      toast.success('Request created successfully');
      setNewRequest({
        title: '',
        description: '',
        task_type: 'feature_request',
        priority: 'normal',
        category: ''
      });
      setIsAddingRequest(false);
      loadRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, status: AdminRequest['status']) => {
    try {
      await AdminRequestService.updateRequest(requestId, { status });
      toast.success(`Request marked as ${status.replace('_', ' ')}`);
      loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const handleEditRequest = (request: AdminRequest) => {
    setEditRequest({
      title: request.title,
      description: request.description,
      task_type: request.task_type,
      priority: request.priority,
      category: request.category,
      due_date: request.due_date
    });
    setEditingRequestId(request.id!);
    setIsEditingRequest(true);
  };

  const handleSaveEdit = async () => {
    if (!editRequest.title?.trim()) {
      toast.error('Request title is required');
      return;
    }

    try {
      await AdminRequestService.updateRequest(editingRequestId!, editRequest);
      toast.success('Request updated successfully');
      setIsEditingRequest(false);
      setEditingRequestId(null);
      setEditRequest({});
      loadRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const getStatusIcon = (status: AdminRequest['status']) => {
    switch (status) {
      case 'open': 
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      case 'in_progress': 
        return <PlayCircle className="h-4 w-4 text-primary animate-pulse" />;
      case 'completed': 
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default: 
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: AdminRequest['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusBadge = (status: AdminRequest['status']) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Not Started</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRequestTypeLabel = (type: AdminRequest['task_type']) => {
    switch (type) {
      case 'feature_request': return 'Feature Request';
      case 'bug_fix': return 'Bug Fix';
      case 'improvement': return 'Improvement';
      case 'maintenance': return 'Maintenance';
      default: return type;
    }
  };

  const getRequestTypeIcon = (type: AdminRequest['task_type']) => {
    switch (type) {
      case 'feature_request': return <Plus className="h-4 w-4" />;
      case 'bug_fix': return <Bug className="h-4 w-4" />;
      case 'improvement': return <Wrench className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const statusMatch = filter === 'all' || request.status === filter;
    const priorityMatch = priorityFilter === 'all' || request.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Admin Requests
          <Dialog open={isAddingRequest} onOpenChange={setIsAddingRequest}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Request title"
                  value={newRequest.title || ''}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                />
                <Textarea
                  placeholder="Request description"
                  value={newRequest.description || ''}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={newRequest.task_type}
                    onValueChange={(value) => setNewRequest({ ...newRequest, task_type: value as AdminRequest['task_type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="bug_fix">Bug Fix</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={newRequest.priority}
                    onValueChange={(value) => setNewRequest({ ...newRequest, priority: value as AdminRequest['priority'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Category (optional)"
                  value={newRequest.category || ''}
                  onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingRequest(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRequest}>
                    Create Request
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Request Dialog */}
          <Dialog open={isEditingRequest} onOpenChange={setIsEditingRequest}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Request title"
                  value={editRequest.title || ''}
                  onChange={(e) => setEditRequest({ ...editRequest, title: e.target.value })}
                />
                <Textarea
                  placeholder="Request description"
                  value={editRequest.description || ''}
                  onChange={(e) => setEditRequest({ ...editRequest, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={editRequest.task_type}
                    onValueChange={(value) => setEditRequest({ ...editRequest, task_type: value as AdminRequest['task_type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="bug_fix">Bug Fix</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={editRequest.priority}
                    onValueChange={(value) => setEditRequest({ ...editRequest, priority: value as AdminRequest['priority'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Category (optional)"
                  value={editRequest.category || ''}
                  onChange={(e) => setEditRequest({ ...editRequest, category: e.target.value })}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditingRequest(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Request List */}
        <ScrollArea className="h-[600px]">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No requests found matching the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className={`p-4 transition-all hover:shadow-md ${
                  request.status === 'completed' ? 'bg-green-50/50 border-green-200' :
                  request.status === 'in_progress' ? 'bg-blue-50/50 border-blue-200' :
                  'bg-gray-50/50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        {getRequestTypeIcon(request.task_type)}
                        <h3 className="font-semibold">{request.title}</h3>
                        {getStatusBadge(request.status)}
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {getRequestTypeLabel(request.task_type)}
                        </Badge>
                      </div>
                      {request.description && (
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(request.created_at!).toLocaleDateString()}
                        </span>
                        {request.category && (
                          <Badge variant="secondary">{request.category}</Badge>
                        )}
                        {request.due_date && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {new Date(request.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {request.completed_at && (
                          <span className="text-green-600">
                            Completed: {new Date(request.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRequest(request)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {request.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRequestStatus(request.id!, 'in_progress')}
                        >
                          Start Work
                        </Button>
                      )}
                      {request.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequestStatus(request.id!, 'completed')}
                          className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                        >
                          Mark Complete
                        </Button>
                      )}
                      {request.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRequestStatus(request.id!, 'open')}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AdminRequestManager;