import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, TrendingUp, Users, FileText, CheckCircle2 } from "lucide-react";

interface Analytics {
  totalGroups: number;
  totalTasks: number;
  totalSubmissions: number;
  averageScore: number;
  submissionRate: number;
  groupStats: { groupName: string; submissionRate: number; averageScore: number; taskCount: number }[];
}

export default function AnalyticsDashboard() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.role === "teacher";

  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
    enabled: !!token,
  });

  const downloadCSV = async () => {
    try {
      const response = await fetch("/api/analytics/export-csv", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "grades-report.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Your analytics report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to download the analytics report.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieData = [
    { name: "Submitted", value: analytics.totalSubmissions, fill: "#3b82f6" },
    { name: "Pending", value: Math.max(0, (analytics.totalTasks * 3) - analytics.totalSubmissions), fill: "#e5e7eb" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {isTeacher ? "View your classroom performance metrics" : "View your learning progress across groups"}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={downloadCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export as CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalGroups}</div>
            <p className="text-xs text-muted-foreground">Active groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTasks}</div>
            <p className="text-xs text-muted-foreground">Assigned tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">{analytics.submissionRate}% rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageScore}/100</div>
            <p className="text-xs text-muted-foreground">Class average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Group Performance</CardTitle>
            <CardDescription>Submission rates and average scores by group</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.groupStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.groupStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="groupName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="submissionRate" fill="#3b82f6" name="Submission Rate (%)" />
                  <Bar dataKey="averageScore" fill="#10b981" name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No group data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Group Details</CardTitle>
            <CardDescription>Task count and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.groupStats.length > 0 ? (
                analytics.groupStats.map((group, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{group.groupName}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.taskCount} tasks
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1 block">
                        {group.submissionRate}% submitted
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Avg: {group.averageScore}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No groups created yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
