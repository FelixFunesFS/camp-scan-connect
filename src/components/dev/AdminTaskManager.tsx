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
import { Plus, Calendar, User, Clock, AlertCircle, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { AdminTaskService, AdminTask } from '@/services/adminTaskService';

export const AdminTaskManager = () => {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');

  // New task form state
  const [newTask, setNewTask] = useState<Partial<AdminTask>>({
    title: '',
    description: '',
    task_type: 'feature_request',
    priority: 'normal',
    category: '',
    estimated_hours: undefined
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await AdminTaskService.getAllTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title?.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      await AdminTaskService.createTask(newTask as AdminTask);
      toast.success('Task created successfully');
      setNewTask({
        title: '',
        description: '',
        task_type: 'feature_request',
        priority: 'normal',
        category: '',
        estimated_hours: undefined
      });
      setIsAddingTask(false);
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: AdminTask['status']) => {
    try {
      await AdminTaskService.updateTask(taskId, { status });
      toast.success(`Task marked as ${status.replace('_', ' ')}`);
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const getStatusIcon = (status: AdminTask['status']) => {
    switch (status) {
      case 'open': return <Circle className="h-4 w-4" />;
      case 'in_progress': return <PlayCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: AdminTask['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getTaskTypeLabel = (type: AdminTask['task_type']) => {
    switch (type) {
      case 'feature_request': return 'Feature Request';
      case 'bug_fix': return 'Bug Fix';
      case 'improvement': return 'Improvement';
      case 'maintenance': return 'Maintenance';
      default: return type;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filter === 'all' || task.status === filter;
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading tasks...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Admin Tasks
          <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Task title"
                  value={newTask.title || ''}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
                <Textarea
                  placeholder="Task description"
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={newTask.task_type}
                    onValueChange={(value) => setNewTask({ ...newTask, task_type: value as AdminTask['task_type'] })}
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
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value as AdminTask['priority'] })}
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
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Category (optional)"
                    value={newTask.category || ''}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Est. hours"
                    value={newTask.estimated_hours || ''}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: parseInt(e.target.value) || undefined })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Create Task
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
              <SelectItem value="open">Open</SelectItem>
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

        {/* Task List */}
        <ScrollArea className="h-[600px]">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found matching the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(task.status)}
                        <h3 className="font-semibold">{task.title}</h3>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">
                          {getTaskTypeLabel(task.task_type)}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(task.created_at!).toLocaleDateString()}
                        </span>
                        {task.estimated_hours && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {task.estimated_hours}h est.
                          </span>
                        )}
                        {task.category && (
                          <Badge variant="secondary">{task.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {task.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateTaskStatus(task.id!, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateTaskStatus(task.id!, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateTaskStatus(task.id!, 'open')}
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