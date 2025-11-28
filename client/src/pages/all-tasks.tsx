import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import type { TaskWithSubmissionStatus } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  FileText,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

interface TaskWithGroup extends TaskWithSubmissionStatus {
  groupName: string;
}

export default function AllTasks() {
  const { token } = useAuth();

  const { data: tasks, isLoading } = useQuery<TaskWithGroup[]>({
    queryKey: ["/api/tasks/all"],
    enabled: !!token,
  });

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

  // Sort tasks by due date
  const sortedTasks = tasks?.sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  ) || [];

  const submittedTasks = sortedTasks.filter((t) => t.submissionStatus && t.submissionStatus !== "not_submitted");
  const pendingTasks = sortedTasks.filter((t) => !t.submissionStatus || t.submissionStatus === "not_submitted");

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">All Tasks</h1>
        <p className="text-muted-foreground">View all tasks from your enrolled groups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedTasks.length}</div>
            <p className="text-xs text-muted-foreground">Across all groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">Not yet submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedTasks.length}</div>
            <p className="text-xs text-muted-foreground">Submitted tasks</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pending Tasks ({pendingTasks.length})</h2>
        {pendingTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription>{task.groupName}</CardDescription>
                    </div>
                    {getDueDateBadge(task.dueDate)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due {format(new Date(task.dueDate), "MMM d, yyyy h:mm a")}
                  </div>
                  <Link href={`/tasks/${task.id}/submit`}>
                    <Button className="w-full" data-testid={`button-submit-${task.id}`}>
                      Submit Task
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No pending tasks
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Submitted Tasks ({submittedTasks.length})</h2>
        {submittedTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {submittedTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <CardDescription>{task.groupName}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(task.submissionStatus)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getStatusText(task.submissionStatus, task.score)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due {format(new Date(task.dueDate), "MMM d, yyyy h:mm a")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No submitted tasks yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
