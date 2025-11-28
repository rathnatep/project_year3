import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, SubmissionWithStudent } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
} from "lucide-react";
import { format } from "date-fns";

interface TaskWithGroup extends Task {
  groupName: string;
}

export default function SubmissionReview() {
  const { taskId } = useParams<{ taskId: string }>();
  const { token } = useAuth();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: task, isLoading: taskLoading } = useQuery<TaskWithGroup>({
    queryKey: ["/api/tasks", taskId, "details"],
    enabled: !!token && !!taskId,
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<SubmissionWithStudent[]>({
    queryKey: ["/api/tasks", taskId, "submissions"],
    enabled: !!token && !!taskId,
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({ submissionId, score }: { submissionId: string; score: number }) => {
      return await apiRequest("PATCH", `/api/submissions/${submissionId}/score`, { score });
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "submissions"] });
      setSavingId(null);
      toast({
        title: "Score saved",
        description: "The student's score has been updated.",
      });
    },
    onError: (error: Error) => {
      setSavingId(null);
      toast({
        title: "Failed to save score",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScoreChange = (submissionId: string, value: string) => {
    const numValue = parseInt(value);
    if (value === "" || (numValue >= 0 && numValue <= 100)) {
      setScores({ ...scores, [submissionId]: value });
    }
  };

  const handleSaveScore = (submissionId: string) => {
    const scoreValue = scores[submissionId];
    if (scoreValue === undefined || scoreValue === "") {
      toast({
        title: "Score required",
        description: "Please enter a score between 0 and 100.",
        variant: "destructive",
      });
      return;
    }
    setSavingId(submissionId);
    updateScoreMutation.mutate({ submissionId, score: parseInt(scoreValue) });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = taskLoading || submissionsLoading;

  const gradedSubmissions = submissions?.filter((s) => s.score !== null) || [];
  const pendingSubmissions = submissions?.filter((s) => s.score === null) || [];

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

  if (!task) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Task not found</h3>
            <p className="text-muted-foreground mb-4">
              This task doesn't exist or you don't have access to it.
            </p>
            <Link href="/dashboard">
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
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/groups/${task.groupId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{task.title}</h1>
          <p className="text-muted-foreground">
            {task.groupName} · {submissions?.length || 0} submissions
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
            <Clock className="h-4 w-4" />
            Not Graded ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="graded" className="gap-2" data-testid="tab-graded">
            <CheckCircle2 className="h-4 w-4" />
            Graded ({gradedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2" data-testid="tab-all">
            All ({submissions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  score={scores[submission.id] ?? ""}
                  onScoreChange={(value) => handleScoreChange(submission.id, value)}
                  onSave={() => handleSaveScore(submission.id)}
                  isSaving={savingId === submission.id}
                  getInitials={getInitials}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="All caught up!"
              description="No pending submissions to grade."
            />
          )}
        </TabsContent>

        <TabsContent value="graded">
          {gradedSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gradedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  score={scores[submission.id] ?? submission.score?.toString() ?? ""}
                  onScoreChange={(value) => handleScoreChange(submission.id, value)}
                  onSave={() => handleSaveScore(submission.id)}
                  isSaving={savingId === submission.id}
                  getInitials={getInitials}
                  isGraded
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="No graded submissions"
              description="Grade pending submissions to see them here."
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          {submissions && submissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {submissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  score={scores[submission.id] ?? submission.score?.toString() ?? ""}
                  onScoreChange={(value) => handleScoreChange(submission.id, value)}
                  onSave={() => handleSaveScore(submission.id)}
                  isSaving={savingId === submission.id}
                  getInitials={getInitials}
                  isGraded={submission.score !== null}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No submissions yet"
              description="Students haven't submitted their work yet."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubmissionCard({
  submission,
  score,
  onScoreChange,
  onSave,
  isSaving,
  getInitials,
  isGraded = false,
}: {
  submission: SubmissionWithStudent;
  score: string;
  onScoreChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  getInitials: (name: string) => string;
  isGraded?: boolean;
}) {
  return (
    <Card data-testid={`card-submission-${submission.id}`} className={isGraded ? "border-green-500/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(submission.studentName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{submission.studentName}</CardTitle>
              <CardDescription>{submission.studentEmail}</CardDescription>
            </div>
          </div>
          {isGraded && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {submission.score}/100
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
        </div>

        {submission.textContent && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm whitespace-pre-wrap line-clamp-4">
              {submission.textContent}
            </p>
          </div>
        )}

        {submission.fileUrl && (
          <a
            href={submission.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-2 p-2 bg-muted rounded-lg hover-elevate"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm flex-1 truncate">
              {submission.fileUrl.split("/").pop()}
            </span>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="Score"
              value={score}
              onChange={(e) => onScoreChange(e.target.value)}
              className="w-24"
              data-testid={`input-score-${submission.id}`}
            />
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            data-testid={`button-save-score-${submission.id}`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isGraded ? "Update" : "Save"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4 text-muted-foreground">
          {icon}
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
