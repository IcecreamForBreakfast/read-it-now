import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit3, Save, Share, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import type { Note } from "@shared/schema";

export default function ReferenceDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingAnnotation, setIsEditingAnnotation] = useState(false);
  const [annotationText, setAnnotationText] = useState("");

  // Fetch the specific note
  const {
    data: note,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/notes", id],
    queryFn: async () => {
      const response = await fetch(`/api/notes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch note');
      return response.json();
    },
    enabled: !!user && !!id,
  });

  // Update annotation text when note data changes
  useEffect(() => {
    if (note?.annotation !== undefined) {
      setAnnotationText(note.annotation || "");
    }
  }, [note?.annotation]);

  // Update annotation mutation
  const updateAnnotationMutation = useMutation({
    mutationFn: async (annotation: string) => {
      const response = await apiRequest("PATCH", `/api/notes/${id}/annotation`, { annotation });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsEditingAnnotation(false);
      toast({
        title: "Annotation saved",
        description: "Your notes have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save annotation",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Article deleted",
        description: "Article has been removed from your collection",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete article",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSaveAnnotation = () => {
    updateAnnotationMutation.mutate(annotationText);
  };

  const handleCancelAnnotation = () => {
    setAnnotationText(note?.annotation || "");
    setIsEditingAnnotation(false);
  };

  const handleShare = async () => {
    if (note?.url) {
      try {
        await navigator.clipboard.writeText(note.url);
        toast({
          title: "Link copied",
          description: "Article URL has been copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Failed to copy link",
          description: "Could not copy URL to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteNoteMutation.mutate();
    }
  };

  const getTagColor = (tag: string) => {
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "uncertain") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Article not found</h2>
          <p className="text-slate-600 mb-4">The article you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard?view=reference")}
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reference
          </Button>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleShare}
              className="text-slate-600 hover:text-slate-800 transition-colors"
            >
              <Share className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteNoteMutation.isPending}
              className="text-slate-600 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Article Header */}
        <Card className="mb-2">
          <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTagColor(note.tag)}`}>
              {note.tag}
            </span>
            <div className="text-sm text-slate-500">
              Saved {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{note.title}</h1>
          <div className="flex items-center text-sm text-slate-600">
            <span>{note.domain}</span>
            <span className="mx-2">•</span>
            <a
              href={note.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center"
            >
              View Original
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
          </CardContent>
        </Card>

        {/* Annotation Section */}
        <Card className="mb-2">
          <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-slate-800">Your Notes</h2>
            {!isEditingAnnotation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingAnnotation(true)}
                className="text-slate-600 hover:text-slate-800"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {note.annotation ? "Edit" : "Add Notes"}
              </Button>
            )}
          </div>

          {isEditingAnnotation ? (
            <div className="space-y-4">
              <Textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="Add your thoughts, insights, or notes about this article..."
                className="min-h-32 resize-y"
                rows={6}
              />
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancelAnnotation}
                  disabled={updateAnnotationMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAnnotation}
                  disabled={updateAnnotationMutation.isPending}
                  className="bg-primary text-white hover:bg-blue-700"
                >
                  {updateAnnotationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notes
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose max-w-none">
              {note.annotation ? (
                <div className="whitespace-pre-wrap text-slate-700 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  {note.annotation}
                </div>
              ) : (
                <div className="text-slate-500 italic bg-slate-50 rounded-lg p-4 border border-slate-200">
                  No notes yet. Click "Add Notes" to capture your thoughts about this article.
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Article Content */}
        <Card>
          <CardContent className="p-3">
          <div className="prose prose-slate prose-lg max-w-none">
            {note.content ? (
              <div className="text-slate-700 leading-relaxed">
                {note.content.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4 text-base leading-7">
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>Article content could not be extracted.</p>
                <p className="mt-2">
                  <a
                    href={note.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline"
                  >
                    View the original article
                  </a>
                </p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}