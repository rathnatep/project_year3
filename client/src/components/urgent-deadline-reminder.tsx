import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, X, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TaskWithSubmissionStatus } from "@shared/schema";

const funnyMessages = [
  "Your deadline is doing a disappearing act! 🚀",
  "Plot twist: The deadline is sooner than you think! ⏰",
  "Time's ticking faster than you'd like! ⚡",
  "Your task just entered the final boss arena! 💪",
  "Procrastination level: Expert. Time left: Not expert.",
  "Your deadline called. It's lonely. Submit soon!",
  "This deadline hits different... literally.",
  "Speed run mode ACTIVATED! ⚡",
  "Your task said: 'Come at me NOW!' 🎯",
  "The clock is doing cardio today! 🏃",
];

function getFunnyMessage(): string {
  return funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
}

export function UrgentDeadlineReminder() {
  const { toast } = useToast();

  const { data: urgentTasks, isLoading } = useQuery<TaskWithSubmissionStatus[]>({
    queryKey: ["/api/tasks/urgent"],
  });

  const dismissMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("POST", `/api/tasks/${taskId}/dismiss-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/urgent"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!urgentTasks || urgentTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {urgentTasks.map((task) => (
        <Card key={task.id} className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">{task.title}</h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-1">
                  Due in {formatDistanceToNow(new Date(task.dueDate))}
                </p>
                <p className="text-xs italic text-orange-700 dark:text-orange-300">
                  {getFunnyMessage()}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dismissMutation.mutate(task.id)}
              disabled={dismissMutation.isPending}
              data-testid={`button-dismiss-reminder-${task.id}`}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Got it
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
