import { useEffect, useState } from "react";
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
import { Bookmark, Plus, LogOut, HelpCircle, Loader2, Archive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Article } from "@shared/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  
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

  const {
    data: articles = [],
    isLoading: articlesLoading,
    error: articlesError,
  } = useQuery({
    queryKey: ["/api/articles"],
    enabled: !!user,
  });

  // Also fetch notes with state filtering for reference view
  const {
    data: notes = [],
    isLoading: notesLoading,
  } = useQuery({
    queryKey: ["/api/notes", "state", activeView === "reference" ? "saved" : "inbox"],
    queryFn: async () => {
      const response = await fetch(`/api/notes?state=${activeView === "reference" ? "saved" : "inbox"}`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    enabled: !!user && activeView === "reference",
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });

  const saveArticleMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/articles", { url });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Article saved",
        description: "Article has been added to your inbox",
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

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/articles/${id}`);
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/articles"] });
      
      // Snapshot the previous value
      const previousArticles = queryClient.getQueryData(["/api/articles"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/articles"], (old: any) => {
        return old?.filter((article: any) => article.id !== id) || [];
      });
      
      // Return a context object with the snapshotted value
      return { previousArticles };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Article deleted",
        description: "Article has been removed from your collection",
      });
    },
    onError: (error, id, context) => {
      // Check if it's a 404 error (article already deleted)
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      const is404 = errorMessage.includes("404") || errorMessage.includes("not found");
      
      if (is404) {
        // Article was already deleted, just show success message
        toast({
          title: "Article deleted",
          description: "Article has been removed from your collection",
        });
        // Don't roll back the optimistic update since the article is actually gone
      } else {
        // If the mutation fails for other reasons, use the context to roll back
        if (context?.previousArticles) {
          queryClient.setQueryData(["/api/articles"], context.previousArticles);
        }
        toast({
          title: "Failed to delete article",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
    },
  });

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveUrl.trim()) {
      saveArticleMutation.mutate(saveUrl.trim());
    }
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteArticleMutation.mutate(id);
    }
  };

  // Get the appropriate data source based on active view
  const currentData = activeView === "reference" 
    ? (notes as Article[])
    : (articles as Article[]);

  const filteredArticles = currentData.filter((article: Article) => {
    // For inbox view, show articles without state or with 'inbox' state
    if (activeView === "inbox") {
      // Show articles that don't have a state (legacy articles) or have 'inbox' state
      const hasNoState = article.state === null || article.state === undefined;
      const isInboxState = article.state === "inbox";
      const showInInbox = hasNoState || isInboxState;
      
      if (!showInInbox) return false;
    }
    // For reference view, only show if it has 'saved' state
    else if (activeView === "reference") {
      if (article.state !== "saved") return false;
    }

    // Then filter by tag
    if (activeFilter === "all") return true;
    return article.tag === activeFilter;
  });

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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bookmark className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-semibold text-slate-800">
                {activeView === "inbox" ? "Inbox" : "Reference"}
              </h1>
              
              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <Button
                  variant={activeView === "inbox" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("inbox")}
                  className="text-xs px-3 py-1 h-7"
                >
                  Inbox
                </Button>
                <Button
                  variant={activeView === "reference" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("reference")}
                  className="text-xs px-3 py-1 h-7"
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Reference
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filters Section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {activeView === "inbox" ? "Your Articles" : "Reference Collection"}
            </h2>
            <div className="flex-1"></div>
            <Button
              onClick={() => setShowSaveModal(true)}
              className="bg-primary text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Save Article
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {uniqueTags.map((tag) => (
              <Button
                key={tag}
                variant={activeFilter === tag ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter(tag)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${activeFilter === tag 
                    ? "bg-primary text-white hover:bg-blue-700" 
                    : getTagColor(tag) + " hover:bg-slate-300"
                  }
                `}
              >
                {tag === "all" ? "All Articles" : tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {(articlesLoading || (activeView === "reference" && notesLoading)) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : articlesError ? (
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load articles</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="text-slate-400 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No articles found</h3>
            <p className="text-slate-600 mb-6">
              {activeView === "reference"
                ? "No saved references yet. Use the bookmark button on inbox items to save them here."
                : activeFilter === "all" 
                  ? "Save some articles to get started."
                  : "No articles found with this tag."}
            </p>
            <Button
              onClick={() => setShowInstructions(true)}
              className="bg-primary text-white hover:bg-blue-700"
            >
              Learn How to Save Articles
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article: Article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onDelete={handleDeleteArticle}
                onSaveForReference={(id) => {
                  // Optimistically update the view
                  queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
                }}
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
