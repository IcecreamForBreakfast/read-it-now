import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArticleCard } from "@/components/article-card";
import { SaveInstructionsModal } from "@/components/save-instructions-modal";
import { PasswordChange } from "@/components/password-change";
import { AutoTagAnalytics } from "@/components/auto-tag-analytics";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Plus, LogOut, HelpCircle, Loader2, Archive, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Note } from "@shared/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Check URL for view parameter
  const urlParams = new URLSearchParams(window.location.search);
  const viewFromUrl = urlParams.get('view');
  const [activeView, setActiveView] = useState<"inbox" | "reference">(
    (viewFromUrl === "reference") ? "reference" : "inbox"
  );
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveUrl, setSaveUrl] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Use unified notes API for both inbox and reference views
  const {
    data: notes = [],
    isLoading: notesLoading,
    error: notesError,
  } = useQuery({
    queryKey: ["/api/notes", "state", activeView === "reference" ? "saved" : "inbox"],
    queryFn: async () => {
      const response = await fetch(`/api/notes?state=${activeView === "reference" ? "saved" : "inbox"}`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });

  // Fuzzy search function
  const fuzzySearch = (query: string, text: string): boolean => {
    if (!query) return true;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const searchableText = text.toLowerCase();
    
    return searchTerms.every(term => {
      // Exact match
      if (searchableText.includes(term)) return true;
      
      // Fuzzy match - allow some character differences
      for (let i = 0; i <= searchableText.length - term.length; i++) {
        const substring = searchableText.substring(i, i + term.length);
        let differences = 0;
        
        for (let j = 0; j < term.length; j++) {
          if (term[j] !== substring[j]) differences++;
        }
        
        // Allow 1 character difference for terms longer than 3 characters
        if (differences <= (term.length > 3 ? 1 : 0)) return true;
      }
      
      return false;
    });
  };

  // Filter and search notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Apply tag filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((note: Note) => note.tag === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((note: Note) => {
        const searchableContent = [
          note.title || '',
          note.content || '',
          note.annotation || ''
        ].join(' ');
        
        return fuzzySearch(searchQuery, searchableContent);
      });
    }

    return filtered;
  }, [notes, activeFilter, searchQuery]);

  const saveArticleMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/notes", { url, state: "saved" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Article saved",
        description: "Article has been added to your reference collection",
      });
      setSaveUrl("");
      setShowSaveModal(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to save article",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/notes"] });
      
      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData(["/api/notes", "state", activeView === "reference" ? "saved" : "inbox"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/notes", "state", activeView === "reference" ? "saved" : "inbox"], (old: any) => {
        return old?.filter((note: any) => note.id !== id) || [];
      });
      
      // Return a context object with the snapshotted value
      return { previousNotes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Note deleted",
        description: "Note has been removed from your collection",
      });
    },
    onError: (error, id, context) => {
      // Check if it's a 404 error (note already deleted)
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      const is404 = errorMessage.includes("404") || errorMessage.includes("not found");
      
      if (is404) {
        // Note was already deleted, just show success message
        toast({
          title: "Note deleted",
          description: "Note has been removed from your collection",
        });
      } else {
        // If the mutation fails for other reasons, use the context to roll back
        if (context?.previousNotes) {
          queryClient.setQueryData(["/api/notes", "state", activeView === "reference" ? "saved" : "inbox"], context.previousNotes);
        }
        toast({
          title: "Failed to delete note",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveUrl.trim()) {
      saveArticleMutation.mutate(saveUrl.trim());
    }
  };



  const uniqueTags = ["all", ...Array.from(new Set(tags as string[]))];

  const getTagColor = (tag: string) => {
    if (tag === "all") return "bg-primary text-white";
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "tech") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Row 1: Toggle + Action Buttons */}
          <div className="flex items-center justify-between py-3">
            {/* Large View Toggle (serves as both control and label) */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <Button
                variant={activeView === "inbox" ? "default" : "ghost"}
                size="lg"
                onClick={() => setActiveView("inbox")}
                className="px-6 py-2 h-10 text-base font-medium"
              >
                Inbox
              </Button>
              <Button
                variant={activeView === "reference" ? "default" : "ghost"}
                size="lg"
                onClick={() => setActiveView("reference")}
                className="px-6 py-2 h-10 text-base font-medium"
              >
                Reference
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowSaveModal(true)}
                size="sm"
                className="bg-primary text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(true)}
                className="text-slate-600 hover:text-slate-800"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-600 hover:text-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Search Bar */}
          <div className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search articles and notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Row 3: Condensed Tag Pills */}
          <div className="pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {uniqueTags.map((tag) => (
                <Button
                  key={tag}
                  variant={activeFilter === tag ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveFilter(tag)}
                  className={`
                    flex-shrink-0 px-3 py-1 h-7 rounded-full text-xs font-medium transition-colors
                    ${activeFilter === tag 
                      ? "bg-primary text-white" 
                      : getTagColor(tag) + " hover:bg-slate-300"
                    }
                  `}
                >
                  {tag === "all" ? "All Articles" : tag}
                  {tag !== "all" && (
                    <span className="ml-1 opacity-70">
                      {notes.filter((note: Note) => note.tag === tag).length}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Notes Grid */}
        {notesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notesError ? (
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load notes</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="text-slate-400 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {searchQuery ? "No articles match your search" : "No articles found"}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery 
                ? `Try searching for something else or clear your search term`
                : activeView === "reference"
                  ? "Save some articles to see them here"
                  : "No articles in your inbox yet"
              }
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowSaveModal(true)}
                className="bg-primary text-white hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Save Your First Article
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note: Note) => (
              <ArticleCard
                key={note.id}
                article={note}
                onDelete={(id) => deleteNoteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Save Article Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Save Article</h2>
            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Article URL
                </label>
                <Input
                  type="url"
                  value={saveUrl}
                  onChange={(e) => setSaveUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveArticleMutation.isPending}
                  className="bg-primary text-white hover:bg-blue-700"
                >
                  {saveArticleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Article"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Tag Analytics Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <AutoTagAnalytics />
      </div>

      {/* Password Change Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <PasswordChange />
      </div>

      {/* Save Instructions Modal */}
      <SaveInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  );
}
