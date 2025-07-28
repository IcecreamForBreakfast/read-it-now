import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, Trash2, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Saved for reference",
        description: "Article has been saved to your reference collection",
      });
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

  const handleCardClick = () => {
    if (!isEditingTag) {
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

  const getTagColor = (tag: string) => {
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "uncertain") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  return (
    <article
      onClick={handleCardClick}
      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-800 mb-3 group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        
        {/* Annotation (larger, no label) */}
        {article.state === "saved" && article.annotation && (
          <p className="text-sm text-slate-500 italic mb-3 line-clamp-2">
            {article.annotation.length > 100 
              ? `${article.annotation.substring(0, 100)}...` 
              : article.annotation
            }
          </p>
        )}
        
        {/* Content snippet for reference cards */}
        {article.state === "saved" && article.content && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-3">
            {article.content.length > 150 
              ? `${article.content.substring(0, 150)}...` 
              : article.content
            }
          </p>
        )}
        
        {/* Footer with metadata */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">

          {/* Left side: Domain and metadata */}
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span>{article.domain}</span>
            <span>•</span>
            <span>Saved {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}</span>
          </div>
          
          {/* Right side: Tag (tap to edit) and actions */}
          <div className="flex items-center space-x-2">
            {isEditingTag ? (
              <div className="flex items-center space-x-2">
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">work</SelectItem>
                    <SelectItem value="personal">personal</SelectItem>
                    <SelectItem value="uncertain">uncertain</SelectItem>
                    <SelectItem value="untagged">untagged</SelectItem>
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
            ) : (
              <>
                <button
                  onClick={handleTagEditClick}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors hover:bg-opacity-80 ${getTagColor(article.tag)}`}
                >
                  {article.tag}
                </button>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-1">
                  {/* Only show save button for inbox items */}
                  {article.state === 'inbox' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveForReference}
                      disabled={saveForReferenceMutation.isPending}
                      className="text-slate-400 hover:text-blue-600 transition-colors h-7 w-7 p-1"
                      title="Save for reference"
                    >
                      <Bookmark className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="text-slate-400 hover:text-red-600 transition-colors h-7 w-7 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
