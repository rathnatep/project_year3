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
  Bell,
} from "lucide-react";
import type { AnnouncementWithTeacher } from "@shared/schema";
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

  const { data: recentAnnouncements } = useQuery<AnnouncementWithTeacher[]>({
    queryKey: ["/api/announcements/all"],
    enabled: !!token,
  });

  const { data: announcementData } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/announcements/unread/count"],
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
    return <Badge variant="secondary" className="text-xs">Due {format(date, "MMM d, h:mm a")}</Badge>;
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
    <div className="min-h-screen bg-background">
      <div className="p-6 lg:p-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground">View your upcoming tasks and assignments</p>
        </div>

        {recentAnnouncements && recentAnnouncements.length > 0 && (
          <Card className="border-l-4 border-l-info bg-gradient-to-r from-info/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-info" />
                <CardTitle className="text-info">Latest Announcement</CardTitle>
                {(announcementData?.unreadCount ?? 0) > 0 && (
                  <Badge className="ml-auto bg-info/20 text-info border-info/30">{announcementData?.unreadCount} unread</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {recentAnnouncements[0].message}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                From <span className="font-medium">{recentAnnouncements[0].teacherName}</span> · {format(new Date(recentAnnouncements[0].createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-card to-background border-overdue/20 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Pending Tasks</CardTitle>
              <FileText className="h-5 w-5 text-overdue" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-overdue">
                {upcomingTasks?.filter((t) => t.submissionStatus === "not_submitted").length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Need to be submitted</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-background border-warning/20 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">In Review</CardTitle>
              <Clock className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-warning">
                {upcomingTasks?.filter((t) => t.submissionStatus === "submitted").length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting grades</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-background border-success/20 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Completed</CardTitle>
              <ClipboardCheck className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-success">
                {upcomingTasks?.filter((t) => t.submissionStatus === "graded").length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Graded assignments</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6 text-foreground">All Your Tasks</h2>
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
