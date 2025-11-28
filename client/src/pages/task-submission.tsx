import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Submission } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Loader2,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

interface TaskWithGroup extends Task {
  groupName: string;
  teacherName: string;
}

export default function TaskSubmission() {
  const { taskId } = useParams<{ taskId: string }>();
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      textContent: "",
    },
  });

  const { data: task, isLoading: taskLoading } = useQuery<TaskWithGroup>({
    queryKey: ["/api/tasks", taskId, "details"],
    enabled: !!token && !!taskId,
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<Submission>({
    queryKey: ["/api/tasks", taskId, "my-submission"],
    enabled: !!token && !!taskId,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { textContent: string; file?: File }) => {
      const formData = new FormData();
      formData.append("textContent", data.textContent);
      if (data.file) {
        formData.append("file", data.file);
      }

      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "my-submission"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/upcoming"] });
      toast({
        title: "Submission successful",
        description: "Your work has been submitted for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: { textContent: string }) => {
    if (!data.textContent.trim() && !file) {
      toast({
        title: "Submission required",
        description: "Please provide text content or upload a file.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate({ textContent: data.textContent, file: file || undefined });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getDueDateBadge = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="destructive">Due Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-amber-500">Due Tomorrow</Badge>;
    }
    const daysLeft = differenceInDays(date, new Date());
    if (daysLeft <= 3) {
      return <Badge className="bg-amber-500">Due in {daysLeft} days</Badge>;
    }
    return <Badge variant="secondary">{format(date, "MMM d, yyyy")}</Badge>;
  };

  const isLoading = taskLoading || submissionLoading;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
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

  const hasSubmitted = !!submission;
  const isGraded = submission?.score !== null && submission?.score !== undefined;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{task.title}</h1>
            {getDueDateBadge(task.dueDate)}
          </div>
          <p className="text-muted-foreground">
            {task.groupName} · {task.teacherName}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            {task.fileUrl && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {task.fileUrl.split("/").pop()}
                  </p>
                  <p className="text-xs text-muted-foreground">Attachment from teacher</p>
                </div>
                <a
                  href={task.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Button size="sm" variant="outline" data-testid="button-download-attachment">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due: {format(new Date(task.dueDate), "MMMM d, yyyy")}</span>
            </div>
          </CardContent>
        </Card>

        {hasSubmitted ? (
          <Card className={isGraded ? "border-green-500/50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-3">
                  {isGraded ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <CardTitle className="text-lg">Your Submission</CardTitle>
                    <CardDescription>
                      Submitted on {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </div>
                </div>
                {isGraded && (
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{submission.score}/100</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission.textContent && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Your Response</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {submission.textContent}
                  </p>
                </div>
              )}
              {submission.fileUrl && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {submission.fileUrl.split("/").pop()}
                    </p>
                    <p className="text-xs text-muted-foreground">Your uploaded file</p>
                  </div>
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Button size="sm" variant="outline" data-testid="button-download-submission">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
              {!isGraded && (
                <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 p-3 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span>Waiting for teacher review</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submit Your Work</CardTitle>
              <CardDescription>
                Provide your response as text, upload a file, or both
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="textContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Response</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Type your answer here..."
                            className="min-h-[160px] resize-none"
                            data-testid="input-submission-text"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Upload File (Optional)</FormLabel>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="dropzone-submission-file"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip"
                        data-testid="input-submission-file"
                      />
                      {file ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile();
                            }}
                            data-testid="button-remove-submission-file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, DOC, DOCX, TXT, PNG, JPG, ZIP up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Link href="/dashboard">
                      <Button type="button" variant="outline" data-testid="button-cancel-submission">
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-work"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Work"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
