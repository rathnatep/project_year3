import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { SubmissionWithStudent, TaskWithSubmissionStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeadlineReminder } from "@/components/deadline-reminder";
import {
  FileText,
  ClipboardList,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PendingSubmission extends SubmissionWithStudent {
  taskTitle: string;
  taskId: string;
  groupName: string;
}

export default function TeacherDashboard() {
  const { user, token } = useAuth();

  const { data: stats } = useQuery<{ pendingSubmissions: number; totalTasks: number }>({
    queryKey: ["/api/stats"],
    enabled: !!token,
  });

  const { data: pendingSubmissions, isLoading: submissionsLoading } = useQuery<PendingSubmission[]>({
    queryKey: ["/api/submissions/pending"],
    enabled: !!token,
  });

  const { data: upcomingTasks } = useQuery<TaskWithSubmissionStatus[]>({
    queryKey: ["/api/tasks/upcoming"],
    enabled: !!token,
  });

  const { data: announcementData } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/announcements/unread/count"],
    enabled: !!token,
  });

  const getInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 lg:p-10 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
            {(announcementData?.unreadCount ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-auto">{announcementData?.unreadCount} new announcements</Badge>
            )}
          </div>
          <p className="text-muted-foreground">Manage your classes and review submissions</p>
        </div>

        {upcomingTasks && <DeadlineReminder tasks={upcomingTasks} title="Upcoming Deadlines" />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-card to-background border-primary/20 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Active Tasks</CardTitle>
              <FileText className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{stats?.totalTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Assigned to students</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-background border-warning/20 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Pending Reviews</CardTitle>
              <ClipboardList className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-warning">{stats?.pendingSubmissions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Submissions to grade</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-background border-success/20 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Graded</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-success">{(pendingSubmissions?.length || 0) === 0 ? 'All' : '...'}</div>
              <p className="text-xs text-muted-foreground mt-1">Submissions reviewed</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6 text-foreground">Submissions Pending Review</h2>
          {submissionsLoading ? (
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
        ) : pendingSubmissions && pendingSubmissions.length > 0 ? (
          <div className="space-y-4">
            {pendingSubmissions.slice(0, 8).map((submission) => (
              <Card key={submission.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(submission.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{submission.studentName}</CardTitle>
                        <p className="text-sm text-muted-foreground mb-2">
                          {submission.taskTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.groupName} · Submitted {format(new Date(submission.submittedAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Link href={`/tasks/${submission.taskId}/submissions`}>
                      <Button size="sm" data-testid={`button-review-${submission.id}`}>
                        Review
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
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No submissions pending review. Great job staying on top of grading!
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}
