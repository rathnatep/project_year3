import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SubmissionWithStudent, Task } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Loader2,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { FilePreview } from "@/components/file-preview";

interface SubmissionWithTask extends SubmissionWithStudent {
  taskTitle: string;
  groupName: string;
  taskId: string;
}

const ITEMS_PER_PAGE = 6;

export default function AllSubmissions() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: submissions, isLoading } = useQuery<SubmissionWithTask[]>({
    queryKey: ["/api/submissions/all"],
    enabled: !!token,
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({ submissionId, score }: { submissionId: string; score: number }) => {
      return await apiRequest("PATCH", `/api/submissions/${submissionId}/score`, { score });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/all"] });
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

  const getInitials = (name?: string) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const groups = [...new Set(submissions?.map((s) => s.groupName) || [])];

  const filteredSubmissions = submissions?.filter(
    (s) => groupFilter === "all" || s.groupName === groupFilter
  );

  const gradedSubmissions = filteredSubmissions?.filter((s) => s.score !== null) || [];
  const pendingSubmissions = filteredSubmissions?.filter((s) => s.score === null) || [];

  // Get group ID for CSV export
  const groupsWithIds = submissions?.reduce((acc, sub) => {
    if (!acc.find((g) => g.name === sub.groupName)) {
      acc.push({ name: sub.groupName, id: sub.groupName });
    }
    return acc;
  }, [] as Array<{ name: string; id: string }>);

  const getGroupIdByName = (groupName: string): string => {
    return groupsWithIds?.find((g) => g.name === groupName)?.id || "";
  };

  const handleExportCsv = () => {
    if (groupFilter === "all") {
      toast({
        title: "Select a group",
        description: "Please select a specific group to export.",
        variant: "destructive",
      });
      return;
    }
    const groupId = getGroupIdByName(groupFilter);
    if (!groupId) {
      toast({
        title: "Error",
        description: "Could not find group ID.",
        variant: "destructive",
      });
      return;
    }
    window.location.href = `/api/analytics/export-csv/${groupId}`;
  };

  // Pagination logic
  const paginateItems = (items: typeof pendingSubmissions) => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  };

  const totalPages = Math.ceil((filteredSubmissions?.length || 0) / ITEMS_PER_PAGE);

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
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Review Submissions</h1>
          <p className="text-muted-foreground">
            {submissions?.length || 0} total submissions across all groups
          </p>
        </div>
        <div className="flex gap-2">
          {groups.length > 1 && (
            <Select value={groupFilter} onValueChange={(value) => { setGroupFilter(value); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px]" data-testid="select-group-filter">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleExportCsv} variant="outline" size="sm" className="gap-2" data-testid="button-export-csv">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
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
            All ({filteredSubmissions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingSubmissions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginateItems(pendingSubmissions).map((submission) => (
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
              {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </>
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginateItems(gradedSubmissions).map((submission) => (
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
              {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </>
          ) : (
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="No graded submissions"
              description="Grade pending submissions to see them here."
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          {filteredSubmissions && filteredSubmissions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginateItems(filteredSubmissions).map((submission) => (
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
              {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </>
          ) : (
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="No submissions"
              description="Students haven't submitted anything yet."
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
  isGraded,
}: {
  submission: SubmissionWithTask;
  score: string;
  onScoreChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  getInitials: (name: string) => string;
  isGraded?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getInitials(submission.studentName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{submission.studentName}</p>
              <p className="text-xs text-muted-foreground">{submission.groupName}</p>
            </div>
          </div>
          {isGraded && <Badge variant="secondary">Graded</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">{submission.taskTitle}</p>
          {submission.textContent && (
            <p className="text-xs text-muted-foreground line-clamp-2">{submission.textContent}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}
        </div>

        {submission.fileUrl && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs truncate">
                {submission.fileUrl.split("/").pop()}
              </span>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <FilePreview fileUrl={submission.fileUrl} />
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                  <Download className="h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="Score (0-100)"
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
            className="flex-1"
            disabled={isSaving}
          />
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            data-testid="button-save-score"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        data-testid="button-prev-page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        data-testid="button-next-page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
