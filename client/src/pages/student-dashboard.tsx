import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GroupWithMembers, TaskWithSubmissionStatus } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Calendar,
  FolderOpen,
  Loader2,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const { data: groups, isLoading: groupsLoading } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
    enabled: !!token,
  });

  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery<TaskWithSubmissionStatus[]>({
    queryKey: ["/api/tasks/upcoming"],
    enabled: !!token,
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/groups/join", { joinCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/upcoming"] });
      setJoinDialogOpen(false);
      setJoinCode("");
      toast({
        title: "Joined group successfully",
        description: "You can now view tasks and submit assignments",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleJoinGroup = () => {
    if (joinCode.trim()) {
      joinGroupMutation.mutate(joinCode.trim().toUpperCase());
    }
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
      return <Badge className="text-xs bg-amber-500">Due in {daysLeft} days</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Due {format(date, "MMM d")}</Badge>;
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

  const getStatusText = (status?: string, score?: number | null) => {
    switch (status) {
      case "graded":
        return `Graded: ${score}/100`;
      case "submitted":
        return "Pending Review";
      default:
        return "Not Submitted";
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground">View your classes and submit assignments</p>
        </div>
        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-join-group">
              <Plus className="h-4 w-4 mr-2" />
              Join Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join a Group</DialogTitle>
              <DialogDescription>
                Enter the 6-character join code provided by your teacher.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="join-code">Join Code</Label>
              <Input
                id="join-code"
                placeholder="e.g., ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="mt-2 font-mono uppercase tracking-wider text-center text-lg"
                data-testid="input-join-code"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleJoinGroup}
                disabled={joinCode.length !== 6 || joinGroupMutation.isPending}
                data-testid="button-confirm-join"
              >
                {joinGroupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Group"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active class enrollments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingTasks?.filter((t) => t.submissionStatus === "not_submitted").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need to be submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingTasks?.filter((t) => t.submissionStatus !== "not_submitted").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Submitted assignments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">My Groups</h2>
          {groupsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="space-y-4">
              {groups.map((group) => (
                <Card key={group.id} className="hover-elevate" data-testid={`card-group-${group.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span>Teacher: {group.ownerName}</span>
                        </CardDescription>
                      </div>
                      <Link href={`/groups/${group.id}`}>
                        <Button size="sm" data-testid={`button-view-group-${group.id}`}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No groups yet</h3>
                <p className="text-muted-foreground mb-4">
                  Join a group using the code from your teacher
                </p>
                <Button onClick={() => setJoinDialogOpen(true)} data-testid="button-join-first-group">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Your First Group
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Tasks</h2>
          {tasksLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : upcomingTasks && upcomingTasks.length > 0 ? (
            <div className="space-y-4">
              {upcomingTasks.slice(0, 5).map((task) => (
                <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{task.title}</CardTitle>
                          {getDueDateBadge(task.dueDate)}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {task.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getStatusIcon(task.submissionStatus)}
                        <span>{getStatusText(task.submissionStatus, task.score)}</span>
                      </div>
                      <Link href={`/tasks/${task.id}/submit`}>
                        <Button size="sm" variant="outline" data-testid={`button-view-task-${task.id}`}>
                          {task.submissionStatus === "not_submitted" ? "Submit" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No upcoming tasks</h3>
                <p className="text-muted-foreground">
                  You're all caught up! Check back later for new assignments.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
