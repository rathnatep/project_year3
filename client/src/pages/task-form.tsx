import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema, type InsertTask, type Task } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
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
} from "lucide-react";
import { format } from "date-fns";

export default function TaskForm() {
  const { groupId, taskId } = useParams<{ groupId?: string; taskId?: string }>();
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!taskId;

  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", taskId],
    enabled: !!token && isEdit,
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema.omit({ groupId: true })),
    defaultValues: {
      title: "",
      description: "",
      dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    },
    values: task
      ? {
          groupId: task.groupId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate.split("T")[0],
        }
      : undefined,
  });

  useState(() => {
    if (task?.fileUrl) {
      setExistingFileUrl(task.fileUrl);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { task: Omit<InsertTask, "groupId">; file?: File }) => {
      const formData = new FormData();
      formData.append("title", data.task.title);
      formData.append("description", data.task.description);
      formData.append("dueDate", data.task.dueDate);
      if (data.file) {
        formData.append("file", data.file);
      }

      const response = await fetch(`/api/groups/${groupId}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      });
      setLocation(`/groups/${groupId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { task: Omit<InsertTask, "groupId">; file?: File }) => {
      const formData = new FormData();
      formData.append("title", data.task.title);
      formData.append("description", data.task.description);
      formData.append("dueDate", data.task.dueDate);
      if (data.file) {
        formData.append("file", data.file);
      }
      if (existingFileUrl === null) {
        formData.append("removeFile", "true");
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", task?.groupId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
      });
      setLocation(`/groups/${task?.groupId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertTask) => {
    const taskData = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
    };

    if (isEdit) {
      updateTaskMutation.mutate({ task: taskData, file: file || undefined });
    } else {
      createTaskMutation.mutate({ task: taskData, file: file || undefined });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExistingFileUrl(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setExistingFileUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isPending = createTaskMutation.isPending || updateTaskMutation.isPending;

  if (isEdit && taskLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={isEdit ? `/groups/${task?.groupId}` : `/groups/${groupId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit Task" : "Create New Task"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? "Update task details" : "Create a new assignment for your students"}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Chapter 5 Homework"
                        data-testid="input-task-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what students need to do..."
                        className="min-h-[120px] resize-none"
                        data-testid="input-task-description"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide clear instructions for your students
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => {
                  const [date, time, meridiem] = field.value 
                    ? field.value.includes(" ") 
                      ? field.value.split(" ")
                      : [field.value, "", ""]
                    : ["", "", "AM"];

                  const handleDateChange = (newDate: string) => {
                    const newValue = time && meridiem ? `${newDate} ${time} ${meridiem}` : newDate;
                    field.onChange(newValue);
                  };

                  const handleTimeChange = (newTime: string) => {
                    const newValue = date ? `${date} ${newTime} ${meridiem}` : date;
                    field.onChange(newValue);
                  };

                  const handleMeridiemChange = (newMeridiem: string) => {
                    const newValue = date && time ? `${date} ${time} ${newMeridiem}` : date;
                    field.onChange(newValue);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Due Date & Time</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              className="pl-10"
                              data-testid="input-task-due-date"
                              value={date}
                              onChange={(e) => handleDateChange(e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              className="flex-1"
                              data-testid="input-task-due-time"
                              value={time}
                              onChange={(e) => handleTimeChange(e.target.value)}
                            />
                            <select
                              className="px-3 py-2 border rounded-md text-sm"
                              data-testid="select-meridiem"
                              value={meridiem}
                              onChange={(e) => handleMeridiemChange(e.target.value)}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Set the due date and time for this task
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="space-y-2">
                <FormLabel>Attachment (Optional)</FormLabel>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-file"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    data-testid="input-file"
                  />
                  {file || existingFileUrl ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">
                          {file?.name || existingFileUrl?.split("/").pop()}
                        </p>
                        {file && (
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        data-testid="button-remove-file"
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
                        PDF, DOC, DOCX, TXT, PNG, JPG up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href={isEdit ? `/groups/${task?.groupId}` : `/groups/${groupId}`}>
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isPending} data-testid="button-save-task">
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEdit ? "Updating..." : "Creating..."}
                    </>
                  ) : isEdit ? (
                    "Update Task"
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
