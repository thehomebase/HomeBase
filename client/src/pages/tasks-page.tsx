import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Calendar, CheckCircle2, Circle, Clock, AlertTriangle,
  Trash2, Edit, ListTodo
} from "lucide-react";

const priorityConfig: Record<string, { label: string; color: string; icon: any }> = {
  urgent: { label: "Urgent", color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle },
  high: { label: "High", color: "text-orange-600 bg-orange-50 border-orange-200", icon: Clock },
  medium: { label: "Medium", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Circle },
  low: { label: "Low", color: "text-gray-600 bg-gray-50 border-gray-200", icon: Circle },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", status: "todo" });

  const { data: tasks = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/tasks"] });
  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: user?.role === "agent" || user?.role === "broker",
  });

  const createTask = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      setShowCreate(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "", status: "todo" });
      toast({ title: "Task created" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      setEditTask(null);
      toast({ title: "Task updated" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      toast({ title: "Task deleted" });
    },
  });

  const toggleComplete = (task: any) => {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    updateTask.mutate({ id: task.id, data: { status: newStatus } });
  };

  const filteredTasks = (tasks as any[]).filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "completed";
    return t.status === filter;
  });

  const overdueTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");
  const todayTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === "completed") return false;
    const d = new Date(t.due_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ListTodo className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Task Manager</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Task</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer" onClick={() => setFilter("all")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("active")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{tasks.filter((t: any) => t.status !== "completed").length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter("completed")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{tasks.filter((t: any) => t.status === "completed").length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading tasks...</p>}

      {todayTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Due Today</h3>
          <div className="space-y-2">
            {todayTasks.map((task: any) => <TaskCard key={task.id} task={task} onToggle={toggleComplete} onEdit={setEditTask} onDelete={(id) => deleteTask.mutate(id)} />)}
          </div>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-red-600 mb-2">Overdue</h3>
          <div className="space-y-2">
            {overdueTasks.map((task: any) => <TaskCard key={task.id} task={task} onToggle={toggleComplete} onEdit={setEditTask} onDelete={(id) => deleteTask.mutate(id)} />)}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filteredTasks.filter(t => !overdueTasks.includes(t) && !todayTasks.includes(t)).map((task: any) => (
          <TaskCard key={task.id} task={task} onToggle={toggleComplete} onEdit={setEditTask} onDelete={(id) => deleteTask.mutate(id)} />
        ))}
      </div>

      {filteredTasks.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks yet. Create one to get started!</p>
        </div>
      )}

      {(showCreate || editTask) && (
        <Dialog open onOpenChange={() => { setShowCreate(false); setEditTask(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Task title"
                value={editTask ? editTask.title : form.title}
                onChange={(e) => editTask ? setEditTask({ ...editTask, title: e.target.value }) : setForm({ ...form, title: e.target.value })}
              />
              <Textarea
                placeholder="Description (optional)"
                value={editTask ? (editTask.description || "") : form.description}
                onChange={(e) => editTask ? setEditTask({ ...editTask, description: e.target.value }) : setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={editTask ? editTask.priority : form.priority}
                    onValueChange={(v) => editTask ? setEditTask({ ...editTask, priority: v }) : setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={editTask ? editTask.status : form.status}
                    onValueChange={(v) => editTask ? setEditTask({ ...editTask, status: v }) : setForm({ ...form, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editTask ? (editTask.due_date ? new Date(editTask.due_date).toISOString().split("T")[0] : "") : form.dueDate}
                  onChange={(e) => editTask ? setEditTask({ ...editTask, due_date: e.target.value }) : setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditTask(null); }}>Cancel</Button>
              <Button
                disabled={createTask.isPending || updateTask.isPending}
                onClick={() => {
                  if (editTask) {
                    updateTask.mutate({ id: editTask.id, data: { title: editTask.title, description: editTask.description, priority: editTask.priority, status: editTask.status, dueDate: editTask.due_date || null } });
                  } else {
                    if (!form.title.trim()) return;
                    createTask.mutate({ title: form.title, description: form.description || undefined, priority: form.priority, status: form.status, dueDate: form.dueDate || undefined });
                  }
                }}
              >
                {editTask ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TaskCard({ task, onToggle, onEdit, onDelete }: { task: any; onToggle: (t: any) => void; onEdit: (t: any) => void; onDelete: (id: number) => void }) {
  const pc = priorityConfig[task.priority] || priorityConfig.medium;
  const sc = statusConfig[task.status] || statusConfig.todo;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  return (
    <Card className={`${task.status === "completed" ? "opacity-60" : ""} ${isOverdue ? "border-red-300" : ""}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <Checkbox checked={task.status === "completed"} onCheckedChange={() => onToggle(task)} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`text-xs ${pc.color}`}>{pc.label}</Badge>
            <Badge variant="outline" className={`text-xs ${sc.color}`}>{sc.label}</Badge>
            {task.due_date && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(task)}><Edit className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(task.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
