import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Target, CheckCircle, X, Plus, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TaggingStats {
  totalArticles: number;
  workCount: number;
  personalCount: number;
  untaggedCount: number;
  suggestions: TaggingSuggestion[];
}

interface TaggingSuggestion {
  id: string;
  type: 'domain' | 'keyword';
  category: 'work' | 'personal';
  value: string;
  count: number;
  description: string;
}

export function AutoTagAnalytics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const { data: stats, isLoading } = useQuery<TaggingStats>({
    queryKey: ["/api/auto-tag/analytics"],
    enabled: isOpen,
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestion: TaggingSuggestion) => {
      const response = await apiRequest("POST", "/api/auto-tag/apply-suggestion", suggestion);
      return response.json();
    },
    onSuccess: (data, suggestion) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-tag/analytics"] });
      setDismissedSuggestions(prev => [...prev, suggestion.id]);
      toast({
        title: "Rule added",
        description: `${suggestion.value} added to ${suggestion.category} ${suggestion.type}s`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to apply suggestion",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // COMMENTED OUT: Retag existing articles feature
  // const retagExistingMutation = useMutation({
  //   mutationFn: async () => {
  //     const response = await apiRequest("POST", "/api/auto-tag/retag-existing", {});
  //     return response.json();
  //   },
  //   onSuccess: (data) => {
  //     queryClient.invalidateQueries({ queryKey: ["/api/auto-tag/analytics"] });
  //     queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
  //     queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
  //     toast({
  //       title: "Articles retagged",
  //       description: `${data.message}. ${data.updated} articles updated.`,
  //     });
  //   },
  //   onError: (error) => {
  //     toast({
  //       title: "Failed to retag articles",
  //       description: error instanceof Error ? error.message : "An error occurred",
  //       variant: "destructive",
  //     });
  //   },
  // });

  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => [...prev, suggestionId]);
  };

  const activeSuggestions = stats?.suggestions.filter(s => !dismissedSuggestions.includes(s.id)) || [];

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-lg">Auto-Tag Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-600">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-slate-600" />
              <div className="flex-1">
                <CardTitle className="text-lg">Auto-Tag Analytics</CardTitle>
                <CardDescription>Track tagging performance and rule suggestions</CardDescription>
              </div>
              {activeSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeSuggestions.length} suggestion{activeSuggestions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {stats && (
              <div className="space-y-6">
                {/* Tag Distribution */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Tag Distribution</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.workCount}</div>
                      <div className="text-sm text-blue-800">Work</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.personalCount}</div>
                      <div className="text-sm text-green-800">Personal</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-600">{stats.untaggedCount}</div>
                      <div className="text-sm text-gray-800">Untagged</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-slate-600">{stats.totalArticles}</div>
                      <div className="text-sm text-slate-800">Total</div>
                    </div>
                  </div>
                </div>

                {/* Rule Suggestions */}
                {activeSuggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Rule Suggestions
                    </h4>
                    <div className="space-y-3">
                      {activeSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {suggestion.type}
                              </Badge>
                              <Badge 
                                variant={suggestion.category === 'work' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {suggestion.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">{suggestion.description}</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => applySuggestionMutation.mutate(suggestion)}
                              disabled={applySuggestionMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissSuggestion(suggestion.id)}
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Insights */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Performance Insights</h4>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Auto-tagged articles:</span>
                      <span className="font-medium">
                        {stats.workCount + stats.personalCount} of {stats.totalArticles}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Accuracy rate:</span>
                      <span className="font-medium">
                        {stats.totalArticles > 0 
                          ? Math.round(((stats.workCount + stats.personalCount) / stats.totalArticles) * 100)
                          : 0}%
                      </span>
                    </div>
                    {stats.untaggedCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Untagged:</span>
                        <span className="font-medium text-gray-600">
                          {stats.untaggedCount} articles
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* COMMENTED OUT: Batch Retag Action */}
                {/* <div>
                  <h4 className="font-medium text-slate-800 mb-3">Actions</h4>
                  <Button
                    onClick={() => retagExistingMutation.mutate()}
                    disabled={retagExistingMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {retagExistingMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Retagging articles...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retag existing untagged articles
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">
                    This will apply auto-tagging to all existing articles that are currently untagged.
                  </p>
                </div> */}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}