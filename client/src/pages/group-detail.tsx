import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Announcements } from "@/components/announcements";
import type { Group, TaskWithSubmissionStatus, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Copy,
  Trash2,
  LogOut,
  Calendar,
  ArrowLeft,
  FileText,
  Paperclip,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Bell,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

interface GroupDetails extends Group {
  ownerName: string;
}

interface GroupMemberDetails {
  id: string;
  userId: string;
  name: string;
  email: string;
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [removeStudentId, setRemoveStudentId] = useState<string | null>(null);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const isTeacher = user?.role === "teacher";

  const { data: group, isLoading: groupLoading } = useQuery<GroupDetails>({
    queryKey: ["/api/groups", id],
    enabled: !!token && !!id,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<TaskWithSubmissionStatus[]>({
    queryKey: ["/api/groups", id, "tasks"],
    enabled: !!token && !!id,
  });

  const { data: members, isLoading: membersLoading } = useQuery<GroupMemberDetails[]>({
    queryKey: ["/api/groups", id, "members"],
    enabled: !!token && !!id,
  });

  const isOwner = group?.ownerId === user?.id;

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Group deleted",
        description: "The group has been permanently removed.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/groups/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Left group",
        description: "You have left this group.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to leave group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "tasks"] });
      setDeleteTaskId(null);
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/groups/${id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setRemoveStudentId(null);
      toast({
        title: "Student removed",
        description: "The student has been removed from this group.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Join code copied",
      description: "Share this code with your students",
    });
  };

  const getDueDateBadge = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="destructive" className="text-xs">Due Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="text-xs bg-amber-500">Due Tomorrow</Badge>;
    }
    const daysLeft = differenceInDays(date, new Date());
    if (daysLeft <= 3) {
      return <Badge className="text-xs bg-amber-500">{daysLeft}d left</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{format(date, "MMM d, h:mm a")}</Badge>;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "graded":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "submitted":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (groupLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Group not found</h3>
            <p className="text-muted-foreground mb-4">
              This group doesn't exist or you don't have access to it.
            </p>
            <Link href="/dashboard" asChild>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" asChild>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{group.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted-foreground text-sm">
                {isTeacher ? "You own this group" : `Teacher: ${group.ownerName}`}
              </span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {group.joinCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyJoinCode(group.joinCode)}
                    data-testid="button-copy-join-code"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <Button
              variant={showAnnouncements ? "default" : "outline"}
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              data-testid="button-messages"
            >
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </Button>
          </div>
          {isOwner ? (
            <>
              <Link href={`/groups/${id}/tasks/new`} asChild>
                <Button data-testid="button-create-task">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </Link>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                data-testid="button-delete-group"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => setLeaveDialogOpen(true)}
              data-testid="button-leave-group"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave
            </Button>
          )}
        </div>
      </div>

      {showAnnouncements && (
        <div>
          <Announcements groupId={id!} isTeacher={isTeacher} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-4">
              <div>
                <CardTitle className="text-lg">Tasks</CardTitle>
                <CardDescription>
                  {tasks?.length || 0} {tasks?.length === 1 ? "task" : "tasks"} in this group
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead className="w-[100px]">Due Date</TableHead>
                        {isTeacher ? (
                          <TableHead className="w-[120px]">Submissions</TableHead>
                        ) : (
                          <TableHead className="w-[120px]">Status</TableHead>
                        )}
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {task.title}
                                  {task.fileUrl && (
                                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {task.description}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getDueDateBadge(task.dueDate)}
                            </div>
                          </TableCell>
                          {isTeacher ? (
                            <TableCell>
                              <span className="text-sm">
                                {task.submissionCount || 0}/{task.totalStudents || 0}
                              </span>
                            </TableCell>
                          ) : (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(task.submissionStatus)}
                                <span className="text-sm capitalize">
                                  {task.submissionStatus === "not_submitted"
                                    ? "Pending"
                                    : task.submissionStatus}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isTeacher ? (
                                <>
                                  <Link href={`/tasks/${task.id}/submissions`}>
                                    <Button size="icon" variant="ghost" data-testid={`button-view-submissions-${task.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteTaskId(task.id)}
                                    data-testid={`button-delete-task-${task.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Link href={`/tasks/${task.id}/submit`}>
                                  <Button size="sm" data-testid={`button-submit-task-${task.id}`}>
                                    {task.submissionStatus === "not_submitted" ? "Submit" : "View"}
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {isOwner
                      ? "Create your first task for this group"
                      : "Your teacher hasn't created any tasks yet"}
                  </p>
                  {isOwner && (
                    <Link href={`/groups/${id}/tasks/new`}>
                      <Button data-testid="button-create-first-task">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-1">
                <div>
                  <CardTitle className="text-lg">Members</CardTitle>
                  <CardDescription>
                    {members?.length || 0} {members?.length === 1 ? "student" : "students"}
                  </CardDescription>
                </div>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 justify-between"
                        data-testid={`member-${member.userId}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>
                        {isOwner && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => setRemoveStudentId(member.userId)}
                            data-testid={`button-remove-student-${member.userId}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No students yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this group? This action cannot be undone. All tasks and submissions will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteGroupMutation.mutate()}
              disabled={deleteGroupMutation.isPending}
              data-testid="button-confirm-delete-group"
            >
              {deleteGroupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this group? You can rejoin with the join code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => leaveGroupMutation.mutate()}
              disabled={leaveGroupMutation.isPending}
              data-testid="button-confirm-leave"
            >
              {leaveGroupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                "Leave Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? All submissions for this task will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaskId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTaskMutation.mutate(deleteTaskId!)}
              disabled={deleteTaskMutation.isPending}
              data-testid="button-confirm-delete-task"
            >
              {deleteTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeStudentId} onOpenChange={(open) => !open && setRemoveStudentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this student from the group? Their submissions and grades will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveStudentId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeStudentMutation.mutate(removeStudentId!)}
              disabled={removeStudentMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeStudentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
