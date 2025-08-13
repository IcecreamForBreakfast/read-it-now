import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Share, Trash2, Loader2, ExternalLink, Bookmark, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { Note } from "@shared/schema";

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [annotation, setAnnotation] = useState("");
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const {
    data: article,
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

  const deleteArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await apiRequest("DELETE", `/api/notes/${articleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
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

  const saveForReferenceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/notes/${id}/state`, { state: "saved" });
    },
    onSuccess: () => {
      // Keep toolbar visible during annotation flow
      setShowFloatingToolbar(true);
      setShowAnnotationForm(true);
      // Delay cache invalidation slightly to prevent flicker
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notes", id] });
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const addAnnotationMutation = useMutation({
    mutationFn: async (annotationText: string) => {
      return await apiRequest("POST", `/api/notes/${id}/annotations`, { 
        text: annotationText 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", id] });
      setShowAnnotationForm(false);
      setShowFloatingToolbar(false);
      setAnnotation("");
      toast({
        title: "Annotation saved",
        description: "Your thoughts have been saved with this article",
      });
      // Navigate back to Inbox dashboard after saving
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Failed to add annotation",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    setLocation("/dashboard");
  };

  const handleShare = async () => {
    if (!article) return;

    try {
      await navigator.share({
        title: article.title,
        url: article.url,
      });
    } catch (error) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(article.url);
      toast({
        title: "Link copied",
        description: "Article URL has been copied to your clipboard",
      });
    }
  };

  const handleDelete = () => {
    if (!article) return;
    if (confirm("Are you sure you want to delete this article?")) {
      deleteArticleMutation.mutate(article.id);
    }
  };

  const handleSaveForReference = () => {
    if (!article) return;
    saveForReferenceMutation.mutate();
  };

  const handleSaveAnnotation = () => {
    if (!annotation.trim()) {
      setShowAnnotationForm(false);
      return;
    }
    addAnnotationMutation.mutate(annotation.trim());
  };

  const handleCancelAnnotation = () => {
    setAnnotation("");
    setShowAnnotationForm(false);
    setShowFloatingToolbar(false);
    // Show success toast when skipping annotation
    toast({
      title: "Saved for reference",
      description: "Article has been saved to your reference collection",
    });
    // Navigate back to Inbox dashboard after skipping annotation
    setLocation("/dashboard");
  };

  const getTagColor = (tag: string) => {
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "tech") return "bg-amber-100 text-amber-800";
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

  if (error || !article) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load article</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Reader Header */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
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
              disabled={deleteArticleMutation.isPending}
              className="text-slate-600 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Article Metadata */}
        <Card className="mb-2">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTagColor(article.tag)}`}>
                {article.tag}
              </span>
              <div className="text-sm text-slate-500">
                Saved {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{article.title}</h1>
            <div className="flex items-center text-sm text-slate-600">
              <span>{article.domain}</span>
              <span className="mx-2">•</span>
              <a
                href={article.url}
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

        {/* Article Content */}
        <Card>
          <CardContent className="p-3">
            <div className="prose prose-slate prose-lg max-w-none">
              {article.content ? (
                <div className="text-slate-700 leading-relaxed">
                  {article.content.split('\n\n').map((paragraph: string, index: number) => (
                    <p key={index} className="mb-6 text-lg leading-8">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Article content could not be extracted.</p>
                  <p className="mt-2">
                    <a
                      href={article.url}
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

      {/* Floating Toolbar - show for inbox articles or during annotation flow */}
      {(article.state === 'inbox' || showFloatingToolbar) && (
        <div className="fixed bottom-6 right-6 z-50">
          {showAnnotationForm ? (
            // Annotation form that appears after saving
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 w-80 mb-4">
              <div className="mb-3">
                <div className="flex items-center mb-2">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-700">Saved!</span>
                </div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What do you want to remember?
                </label>
                <Textarea
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="Add your thoughts, insights, or key takeaways..."
                  className="resize-none"
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAnnotation}
                  disabled={addAnnotationMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAnnotation}
                  disabled={addAnnotationMutation.isPending}
                >
                  {addAnnotationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : null}
          
          {/* Action buttons - only show if not in annotation flow */}
          {!showAnnotationForm && (
            <div className="flex space-x-3">
              <Button
                onClick={handleSaveForReference}
                disabled={saveForReferenceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                size="lg"
              >
                {saveForReferenceMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteArticleMutation.isPending}
                variant="outline"
                className="bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 shadow-lg"
                size="lg"
              >
                {deleteArticleMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
