import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, Edit3, Trash2, Plus, Loader2, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TagStat {
  tag: string;
  count: number;
}

export function TagManagementModal({ isOpen, onClose }: TagManagementModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Fetch all tags
  const { data: allTags } = useQuery({
    queryKey: ["/api/tags"],
    queryFn: async (): Promise<{ tag: string; count: number }[]> => {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");
      return response.json();
    },
    enabled: isOpen,
  });

  // Fetch tag statistics
  const { data: tagStats, isLoading } = useQuery({
    queryKey: ["/api/tags/stats"],
    queryFn: async (): Promise<TagStat[]> => {
      const response = await fetch("/api/tags/stats");
      if (!response.ok) throw new Error("Failed to fetch tag stats");
      return response.json();
    },
    enabled: isOpen,
  });

  // Rename tag mutation
  const renameTagMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      await apiRequest("PATCH", `/api/tags/${encodeURIComponent(oldName)}`, { newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setEditingTag(null);
      setEditValue("");
      toast({
        title: "Tag renamed",
        description: "Tag has been successfully renamed",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to rename tag",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      await apiRequest("DELETE", `/api/tags/${encodeURIComponent(tagName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Tag deleted",
        description: "Tag has been deleted and articles moved to 'untagged'",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete tag",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Create new tag mutation (add to backend custom tags)
  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      // Just add the tag to the backend custom tags list
      await apiRequest("POST", "/api/tags", { tagName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags/stats"] });
      setIsCreatingNew(false);
      setNewTagName("");
      toast({
        title: "Tag created",
        description: "New tag is ready to use for articles.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create tag";
      toast({
        title: "Error",
        description: errorMessage.includes("already exists") ? "Tag already exists" : errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const handleSaveEdit = () => {
    if (!editingTag || !editValue.trim()) return;
    
    const trimmedValue = editValue.trim().toLowerCase();
    if (trimmedValue === editingTag) {
      setEditingTag(null);
      setEditValue("");
      return;
    }
    
    renameTagMutation.mutate({
      oldName: editingTag,
      newName: trimmedValue,
    });
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue("");
  };

  const handleCreateNew = () => {
    if (!newTagName.trim()) return;
    
    const trimmedName = newTagName.trim().toLowerCase();
    
    // Check if tag already exists
    const existingTags = allTags || [];
    if (existingTags.some(tagData => tagData.tag === trimmedName)) {
      toast({
        title: "Tag already exists",
        description: `The tag "${trimmedName}" already exists`,
        variant: "destructive",
      });
      return;
    }
    
    // Prevent creating reserved tags
    if (['all', 'untagged'].includes(trimmedName)) {
      toast({
        title: "Reserved tag name",
        description: "Cannot create reserved tag names",
        variant: "destructive",
      });
      return;
    }
    
    createTagMutation.mutate(trimmedName);
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setNewTagName("");
  };

  const handleDeleteTag = (tag: string) => {
    if (window.confirm(`Are you sure you want to delete the "${tag}" tag? All articles with this tag will be moved to "untagged".`)) {
      deleteTagMutation.mutate(tag);
    }
  };

  const getTagColor = (tag: string) => {
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "uncertain") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Manage Tags</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-slate-600">Loading tags...</span>
            </div>
          ) : !allTags || allTags.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No tags found</p>
              <p className="text-sm mt-2">Tags will appear here when you start tagging articles</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Create new tag section */}
              {isCreatingNew ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 flex-1">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-7 text-sm flex-1 min-w-0"
                      placeholder="Enter new tag name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateNew();
                        if (e.key === "Escape") handleCancelCreate();
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCreateNew}
                      disabled={createTagMutation.isPending}
                      className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelCreate}
                      className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setIsCreatingNew(true)}
                  variant="outline"
                  size="sm"
                  className="w-full mb-4 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Tag
                </Button>
              )}

              {allTags && allTags
                .filter(tagData => !['untagged', 'work', 'personal', 'uncertain'].includes(tagData.tag)) // Hide default/system tags  
                .map((tagData) => {
                  return (
                    <div
                      key={tagData.tag}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {editingTag === tagData.tag ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-sm flex-1 min-w-0"
                              placeholder="Tag name"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={renameTagMutation.isPending}
                              className="text-green-600 hover:text-green-700 h-7 w-7 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tagData.tag)}`}>
                              {tagData.tag}
                            </span>
                            <span className="text-sm text-slate-500 flex-1">
                              {tagData.count} article{tagData.count !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {editingTag !== tagData.tag && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(tagData.tag)}
                            className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTag(tagData.tag)}
                            disabled={deleteTagMutation.isPending}
                            className="text-slate-400 hover:text-red-600 h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              
              {/* Show system tags at bottom for reference */}
              {allTags && allTags.filter(tagData => ['work', 'personal', 'uncertain', 'untagged'].includes(tagData.tag)).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-600 mb-2">System Tags (Read-only)</h4>
                  <div className="space-y-2">
                    {allTags
                      .filter(tagData => ['work', 'personal', 'uncertain', 'untagged'].includes(tagData.tag))
                      .sort((a, b) => b.count - a.count)
                      .map((tagData) => (
                        <div key={tagData.tag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tagData.tag)}`}>
                              {tagData.tag || "Untagged"}
                            </span>
                            <span className="text-sm text-slate-500">
                              {tagData.count} article{tagData.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">Auto-managed</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500 mb-3">
            • Click the edit icon to rename a tag<br />
            • Click the trash icon to delete a tag (articles become "untagged")<br />
            • New tags are created automatically when you assign them to articles
          </p>
          <Button
            onClick={onClose}
            className="w-full bg-primary text-white hover:bg-blue-700"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}