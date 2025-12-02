import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { AnnouncementWithTeacher } from "@shared/schema";

interface AnnouncementsProps {
  groupId: string;
  isTeacher?: boolean;
}

export function Announcements({ groupId, isTeacher = false }: AnnouncementsProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const { data: announcements, isLoading } = useQuery<AnnouncementWithTeacher[]>({
    queryKey: ["/api/announcements", groupId],
    enabled: !!token,
  });

  const markReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      return await apiRequest("POST", `/api/announcements/${announcementId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unread-counts"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (msg: string) => {
      return await apiRequest("POST", "/api/announcements", {
        groupId,
        message: msg,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", groupId] });
      setMessage("");
      toast({
        title: "Announcement posted",
        description: "Your announcement has been shared with the group",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post announcement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePostAnnouncement = () => {
    if (message.trim()) {
      createMutation.mutate(message.trim());
    }
  };

  useEffect(() => {
    if (announcements && announcements.length > 0 && !isTeacher) {
      announcements.forEach((ann) => {
        markReadMutation.mutate(ann.id);
      });
    }
  }, [announcements, isTeacher, markReadMutation]);

  return (
    <div className="space-y-6">
      {isTeacher && (
        <Card className="border-l-4 border-l-info bg-gradient-to-r from-info/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-info">
              <Bell className="h-5 w-5" />
              Post Announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder="Write an announcement for your students..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-24"
                data-testid="textarea-announcement"
              />
              <div className="text-xs text-muted-foreground">
                {message.length}/1000 characters
              </div>
              <Button
                onClick={handlePostAnnouncement}
                disabled={!message.trim() || createMutation.isPending}
                className="w-full"
                data-testid="button-post-announcement"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Post Announcement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-info" />
          Announcements
          {announcements && announcements.length > 0 && (
            <Badge className="ml-auto bg-info/20 text-info border-info/30" data-testid="badge-announcement-count">
              {announcements.length} {announcements.length === 1 ? 'new' : 'new'}
            </Badge>
          )}
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : announcements && announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className="hover-elevate border-l-4 border-l-info bg-gradient-to-r from-info/3 to-transparent"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-info">📢</span>
                        {announcement.teacherName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(announcement.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <Badge className="text-xs bg-info/20 text-info border-info/30">
                      Announcement
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-announcement-message">
                    {announcement.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-muted/20 to-transparent">
            <CardContent className="pt-6 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No announcements yet</p>
              {isTeacher && (
                <p className="text-xs text-muted-foreground mt-2">
                  Post an announcement to keep your students informed
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
