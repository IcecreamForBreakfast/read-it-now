import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, Trash2, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Article } from "@shared/schema";

interface ArticleCardProps {
  article: Article;
  onDelete: (id: string) => void;
}

export function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const [, setLocation] = useLocation();
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [selectedTag, setSelectedTag] = useState(article.tag);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTagMutation = useMutation({
    mutationFn: async (newTag: string) => {
      const response = await apiRequest("PATCH", `/api/articles/${article.id}/tag`, { tag: newTag });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
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

  const handleCardClick = () => {
    if (!isEditingTag) {
      setLocation(`/reader/${article.id}`);
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
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-sm text-slate-600 mb-2">{article.domain}</p>
            <p className="text-xs text-slate-500">
              Saved {formatDistanceToNow(new Date(article.savedAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isEditingTag ? (
              <div className="flex items-center space-x-2">
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-32 h-8">
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
                  className="text-green-600 hover:text-green-700 p-1"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTagCancel}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTagColor(article.tag)}`}>
                  {article.tag}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTagEditClick}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
