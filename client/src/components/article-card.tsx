import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, Trash2, Edit3, Check, X, MoreVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note } from "@shared/schema";

interface ArticleCardProps {
  article: Note;
  onDelete: (id: string) => void;
  onSaveForReference?: (id: string) => void;
}

export function ArticleCard({ article, onDelete, onSaveForReference }: ArticleCardProps) {
  const [, setLocation] = useLocation();
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [selectedTag, setSelectedTag] = useState(article.tag);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [annotation, setAnnotation] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available tags for the dropdown
  const { data: availableTags } = useQuery({
    queryKey: ["/api/tags"],
    queryFn: async (): Promise<{ tag: string; count: number }[]> => {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");
      return response.json();
    },
    enabled: isEditingTag, // Only fetch when editing
  });

  const updateTagMutation = useMutation({
    mutationFn: async (newTag: string) => {
      const response = await apiRequest("PATCH", `/api/notes/${article.id}/tag`, { tag: newTag });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-tag/analytics"] });
      setIsEditingTag(false);
      toast({
        title: "Tag updated",
        description: "Article tag has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update tag",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const saveForReferenceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/notes/${article.id}/state`, { state: "saved" });
      return response.json();
    },
    onSuccess: () => {
      // Show annotation form immediately after saving
      setShowAnnotationForm(true);
      // Delay cache invalidation slightly to prevent flicker
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      }, 100);
      if (onSaveForReference) {
        onSaveForReference(article.id);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to save for reference",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const addAnnotationMutation = useMutation({
    mutationFn: async (annotationText: string) => {
      return await apiRequest("POST", `/api/notes/${article.id}/annotations`, { 
        text: annotationText 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes", article.id] });
      setShowAnnotationForm(false);
      setAnnotation("");
      toast({
        title: "Annotation saved",
        description: "Your thoughts have been saved with this article",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add annotation",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCardClick = () => {
    if (!isEditingTag && !showAnnotationForm) {
      // Navigate to appropriate view based on article state
      if (article.state === "saved") {
        setLocation(`/reference/${article.id}`);
      } else {
        setLocation(`/reader/${article.id}`);
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(article.id);
  };

  const handleTagEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTag(true);
  };

  const handleTagSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTag !== article.tag) {
      updateTagMutation.mutate(selectedTag);
    } else {
      setIsEditingTag(false);
    }
  };

  const handleTagCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTag(article.tag);
    setIsEditingTag(false);
  };

  const handleSaveForReference = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveForReferenceMutation.mutate();
  };

  const handleSaveAnnotation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (annotation.trim()) {
      addAnnotationMutation.mutate(annotation.trim());
    } else {
      // If no annotation, just close the form
      setShowAnnotationForm(false);
      toast({
        title: "Saved for reference",
        description: "Article has been saved to your reference collection",
      });
    }
  };

  const handleCancelAnnotation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAnnotationForm(false);
    setAnnotation("");
    toast({
      title: "Saved for reference",
      description: "Article has been saved to your reference collection",
    });
  };

  const getTagColor = (tag: string) => {
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "uncertain") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  const getShortTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return diffInMinutes < 1 ? "< 1m" : `${diffInMinutes}m`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w`;
  };

  return (
    <article
      onClick={handleCardClick}
      className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer relative"
    >
      <div className="p-3">
        {/* Title */}
        <h3 className="text-base font-semibold text-slate-800 mb-1.5 line-clamp-2 leading-tight">
          {article.title}
        </h3>
        
        {/* Annotation (larger, no label) - keep for saved articles */}
        {article.state === "saved" && article.annotation && (
          <p className="text-sm text-slate-500 italic mb-2 line-clamp-2 leading-tight">
            {article.annotation.length > 100 
              ? `${article.annotation.substring(0, 100)}...` 
              : article.annotation
            }
          </p>
        )}
        
        {/* Content snippet for reference cards */}
        {article.state === "saved" && article.content && (
          <p className="text-sm text-slate-600 mb-2 line-clamp-2 leading-tight">
            {article.content.length > 100 
              ? `${article.content.substring(0, 100)}...` 
              : article.content
            }
          </p>
        )}
        
        {/* Single-line metadata row */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 min-w-0 flex-1">
            <span className="truncate">{article.domain}</span>
            <span>•</span>
            <span className="whitespace-nowrap">{getShortTimeAgo(new Date(article.createdAt))}</span>
          </div>
          <div className="flex items-center space-x-1.5 ml-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(article.tag)}`}>
              {article.tag}
            </span>
            
            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-600 h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTag(true);
                  }}
                  className="text-sm"
                >
                  <Edit3 className="h-3 w-3 mr-2" />
                  Edit tag
                </DropdownMenuItem>
                {article.state === 'inbox' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      saveForReferenceMutation.mutate();
                    }}
                    disabled={saveForReferenceMutation.isPending}
                    className="text-sm"
                  >
                    <Bookmark className="h-3 w-3 mr-2" />
                    Save for reference
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(article.id);
                  }}
                  className="text-sm text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Tag editing overlay */}
        {isEditingTag && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center p-3">
            <div className="flex items-center space-x-2">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTags?.map((tagData) => (
                    <SelectItem key={tagData.tag} value={tagData.tag}>
                      {tagData.tag || "Untagged"} ({tagData.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTagSave}
                disabled={updateTagMutation.isPending}
                className="text-green-600 hover:text-green-700 p-1 h-7 w-7"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTagCancel}
                className="text-slate-400 hover:text-slate-600 p-1 h-7 w-7"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Annotation form - appears below the card after saving */}
      {showAnnotationForm && (
        <div className="bg-white border border-slate-200 rounded-b-lg shadow-lg p-4 animate-in slide-in-from-top-2 duration-200">
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
              onClick={(e) => e.stopPropagation()}
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
      )}
    </article>
  );
}
