import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { TaskWithSubmissionStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function TeacherDashboard() {
  const { user, token } = useAuth();

  const { data: stats } = useQuery<{ pendingSubmissions: number; totalTasks: number }>({
    queryKey: ["/api/stats"],
    enabled: !!token,
  });

  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery<TaskWithSubmissionStatus[]>({
    queryKey: ["/api/tasks/upcoming"],
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

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Manage your classes and review submissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground">Assigned to students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingSubmissions || 0}</div>
            <p className="text-xs text-muted-foreground">Submissions to grade</p>
          </CardContent>
        </Card>
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
            {upcomingTasks.slice(0, 8).map((task) => (
              <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        {getDueDateBadge(task.dueDate)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Link href={`/tasks/${task.id}/submissions`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full" data-testid={`button-view-task-${task.id}`}>
                        View Submissions
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No upcoming tasks</h3>
              <p className="text-muted-foreground">
                All tasks are either completed or overdue. Create new tasks in your groups.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
