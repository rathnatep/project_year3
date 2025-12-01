import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTextTaskSchema, insertQuizTaskSchema, questionSchema, type Question } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

export default function TaskForm() {
  const { groupId } = useParams<{ groupId: string }>();
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [taskMode, setTaskMode] = useState<"text" | "quiz">("text");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quizQuestions, setQuizQuestions] = useState<(Question & { tempId: string })[]>([]);

  const defaultDateTime = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

  const textForm = useForm({
    resolver: zodResolver(insertTextTaskSchema.omit({ groupId: true })),
    defaultValues: {
      title: "",
      description: "",
      dueDate: defaultDateTime,
    },
  });

  const quizForm = useForm({
    resolver: zodResolver(insertQuizTaskSchema.omit({ groupId: true })),
    defaultValues: {
      title: "",
      description: "",
      dueDate: defaultDateTime,
      questions: [],
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("dueDate", data.dueDate);
      formData.append("taskType", data.taskType);

      if (data.taskType === "text_file" && file) {
        formData.append("file", file);
      }

      if (data.taskType === "quiz" && data.questions) {
        formData.append("questions", JSON.stringify(data.questions));
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

  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: "",
        taskId: "",
        questionText: "",
        questionType: "multiple_choice",
        options: JSON.stringify(["", "", "", ""]),
        correctAnswer: "",
        order: quizQuestions.length,
        tempId: Math.random().toString(),
      },
    ]);
  };

  const handleRemoveQuestion = (tempId: string) => {
    setQuizQuestions(quizQuestions.filter((q) => q.tempId !== tempId));
  };

  const handleUpdateQuestion = (tempId: string, field: string, value: any) => {
    setQuizQuestions(
      quizQuestions.map((q) =>
        q.tempId === tempId ? { ...q, [field]: value } : q
      )
    );
  };

  const handleUpdateMCOption = (tempId: string, optionIndex: number, value: string) => {
    setQuizQuestions(
      quizQuestions.map((q) => {
        if (q.tempId === tempId) {
          const opts = JSON.parse(q.options || '["","","",""]');
          opts[optionIndex] = value;
          return { ...q, options: JSON.stringify(opts) };
        }
        return q;
      })
    );
  };

  const handleSubmitText = (data: any) => {
    createTaskMutation.mutate({ ...data, taskType: "text_file" });
  };

  const handleSubmitQuiz = (data: any) => {
    if (quizQuestions.length === 0) {
      toast({
        title: "No questions",
        description: "Add at least one question",
        variant: "destructive",
      });
      return;
    }

    for (const q of quizQuestions) {
      if (!q.questionText?.trim()) {
        toast({
          title: "Empty question text",
          variant: "destructive",
        });
        return;
      }
      if (!q.correctAnswer) {
        toast({
          title: "No correct answer selected",
          variant: "destructive",
        });
        return;
      }
    }

    const questions = quizQuestions.map((q) => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    createTaskMutation.mutate({ ...data, taskType: "quiz", questions });
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

  const isPending = createTaskMutation.isPending;
  const answerLabels = ["A", "B", "C", "D"];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create New Task</h1>
          <p className="text-muted-foreground">Choose a task type for your students</p>
        </div>
      </div>

      {/* Task Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card
          className={`cursor-pointer transition-all hover-elevate ${
            taskMode === "text" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setTaskMode("text")}
          data-testid="card-text-task"
        >
          <CardHeader>
            <CardTitle className="text-lg">Text Answer Task</CardTitle>
            <CardDescription>Students submit text and/or upload files</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover-elevate ${
            taskMode === "quiz" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setTaskMode("quiz")}
          data-testid="card-quiz-task"
        >
          <CardHeader>
            <CardTitle className="text-lg">Quiz Task</CardTitle>
            <CardDescription>Create multiple choice or true/false questions</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Text File Task Form */}
      {taskMode === "text" && (
        <Card>
          <CardContent className="p-6">
            <Form {...textForm}>
              <form onSubmit={textForm.handleSubmit(handleSubmitText)} className="space-y-6">
                <FormField
                  control={textForm.control}
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
                  control={textForm.control}
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
                      <FormDescription>Provide clear instructions</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={textForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date & Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="datetime-local"
                            className="pl-10"
                            data-testid="input-task-due-date"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                          data-testid="button-remove-file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload file</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Link href={`/groups/${groupId}`}>
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isPending} data-testid="button-save-task">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Quiz Task Form */}
      {taskMode === "quiz" && (
        <Card>
          <CardContent className="p-6">
            <Form {...quizForm}>
              <form onSubmit={quizForm.handleSubmit(handleSubmitQuiz)} className="space-y-6">
                <FormField
                  control={quizForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quiz Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Biology Quiz 1" data-testid="input-quiz-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quizForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quiz instructions..."
                          className="min-h-[80px] resize-none"
                          data-testid="input-quiz-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quizForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date & Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input 
                            type="datetime-local" 
                            className="pl-10" 
                            data-testid="input-quiz-due-date"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Questions Section - Always visible */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Questions ({quizQuestions.length})</h3>
                  </div>

                  {quizQuestions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No questions added yet</p>
                  )}

                  {quizQuestions.map((question, idx) => (
                    <Card key={question.tempId} className="p-4 bg-muted/50 border">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Question {idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(question.tempId)}
                            data-testid={`button-remove-question-${idx}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Question Text */}
                        <div>
                          <label className="text-sm font-medium">Question Text</label>
                          <Textarea
                            placeholder="Enter question..."
                            className="mt-1 resize-none"
                            value={question.questionText}
                            onChange={(e) =>
                              handleUpdateQuestion(question.tempId, "questionText", e.target.value)
                            }
                            data-testid={`input-question-text-${idx}`}
                          />
                        </div>

                        {/* Question Type - Only Multiple Choice */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Question Type: Multiple Choice (A/B/C/D)
                          </p>
                        </div>

                        {/* Multiple Choice Options - Only show for MC type */}
                        {question.questionType === "multiple_choice" && (
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Answer Options</label>
                            {(() => {
                              try {
                                const opts = JSON.parse(question.options || '["","","",""]');
                                return answerLabels.map((label, i) => (
                                  <div key={i} className="flex gap-2 items-center">
                                    <span className="font-semibold text-sm bg-secondary px-3 py-2 rounded min-w-[3rem] text-center">
                                      {label}
                                    </span>
                                    <Input
                                      placeholder={`Enter option ${label}...`}
                                      value={opts[i] || ""}
                                      onChange={(e) => handleUpdateMCOption(question.tempId, i, e.target.value)}
                                      data-testid={`input-mc-option-${idx}-${i}`}
                                    />
                                  </div>
                                ));
                              } catch {
                                return <p className="text-red-500 text-sm">Error loading options</p>;
                              }
                            })()}
                          </div>
                        )}

                        {/* Correct Answer */}
                        <div>
                          <label className="text-sm font-medium">Correct Option (A/B/C/D)</label>
                          <Select
                            value={question.correctAnswer}
                            onValueChange={(value) =>
                              handleUpdateQuestion(question.tempId, "correctAnswer", value)
                            }
                          >
                            <SelectTrigger data-testid={`select-correct-answer-${idx}`}>
                              <SelectValue placeholder="Select correct option" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                try {
                                  const opts = JSON.parse(question.options || '["","","",""]');
                                  return answerLabels
                                    .map((label, i) => ({ label, text: opts[i] }))
                                    .filter(opt => opt.text?.trim())
                                    .map(opt => (
                                      <SelectItem key={opt.label} value={opt.label}>
                                        Option {opt.label}: {opt.text}
                                      </SelectItem>
                                    ));
                                } catch {
                                  return <SelectItem value="">Error loading options</SelectItem>;
                                }
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Add Question Button Inside Form */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="w-full"
                    data-testid="button-add-question"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Link href={`/groups/${groupId}`}>
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isPending} data-testid="button-save-task">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Quiz"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
