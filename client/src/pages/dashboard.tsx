import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArticleCard } from "@/components/article-card";
import { SaveInstructionsModal } from "@/components/save-instructions-modal";
import { TokenManager } from "@/components/token-manager";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Plus, LogOut, HelpCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Article } from "@shared/schema";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
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
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Article saved",
        description: "Article has been added to your collection",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Article deleted",
        description: "Article has been removed from your collection",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete article",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
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

  const filteredArticles = articles.filter((article: Article) => {
    if (activeFilter === "all") return true;
    return article.tag === activeFilter;
  });

  const uniqueTags = ["all", ...new Set(tags)];

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
              <h1 className="text-xl font-semibold text-slate-800">Read It Later</h1>
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
        {/* Token Manager */}
        <div className="mb-8">
          <TokenManager />
        </div>

        {/* Filters Section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Your Articles</h2>
            <div className="flex-1"></div>
            <Button
              onClick={() => setShowSaveModal(true)}
              className="bg-primary text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Save Article
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowInstructions(true)}
              className="text-primary border-primary hover:bg-primary hover:text-white"
            >
              How to Save
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
        {articlesLoading ? (
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
              {activeFilter === "all" 
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

      {/* Save Instructions Modal */}
      <SaveInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  );
}
