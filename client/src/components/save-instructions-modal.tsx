import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Smartphone, AlertTriangle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SaveInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveInstructionsModal({ isOpen, onClose }: SaveInstructionsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTokenGeneration, setShowTokenGeneration] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-token");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Token generated",
        description: "Your personal sharing token has been created",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate token",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast({
        title: "Token copied",
        description: "Personal token has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy token to clipboard",
        variant: "destructive",
      });
    }
  };

  const copyShortcutUrl = async () => {
    const baseUrl = window.location.origin;
    const token = user?.user?.personalToken;
    if (!token) return;

    const shortcutUrl = `${baseUrl}/api/save/${token}`;
    try {
      await navigator.clipboard.writeText(shortcutUrl);
      toast({
        title: "Shortcut URL copied",
        description: "Use this URL in your iOS shortcut",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">How to Save Articles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">iOS Safari</h3>
            <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
              <li>Open the article you want to save</li>
              <li>Tap the Share button</li>
              <li>Select "Read It Later" from the share menu</li>
              <li>The article will be saved automatically</li>
            </ol>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Desktop Chrome</h3>
            <ol className="text-green-800 text-sm space-y-1 list-decimal list-inside">
              <li>Navigate to the article you want to save</li>
              <li>Click the "Save to Read Later" bookmarklet</li>
              <li>The article will be added to your collection</li>
            </ol>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Manual Save</h3>
            <ol className="text-purple-800 text-sm space-y-1 list-decimal list-inside">
              <li>Copy the article URL from your browser</li>
              <li>Go to your Read It Later dashboard</li>
              <li>Click the "Save Article" button</li>
              <li>Paste the URL and save</li>
            </ol>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Setup Required</h3>
            <p className="text-amber-800 text-sm">
              You'll need to install the iOS shortcut or add the bookmarklet to your browser for automated saving.
              Setup instructions will be provided via email after registration.
            </p>
          </div>

          {/* iOS Shortcut Integration */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2 mb-3">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">iOS Shortcut Integration</h3>
            </div>
            
            {user?.user?.personalToken ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-blue-900">Your Personal Token</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={user.user.personalToken}
                      readOnly
                      className="bg-white text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToken(user.user.personalToken)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-blue-900">iOS Shortcut URL</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={`${window.location.origin}/api/save/${user.user.personalToken}`}
                      readOnly
                      className="bg-white text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShortcutUrl}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-100 rounded p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Copy the iOS Shortcut URL above</li>
                    <li>Create a new iOS Shortcut</li>
                    <li>Add "Get Contents of URL" action</li>
                    <li>Set URL to the copied URL above</li>
                    <li>Set Method to POST</li>
                    <li>Add shortcut to Share Sheet</li>
                  </ol>
                </div>

                <Collapsible open={showTokenGeneration} onOpenChange={setShowTokenGeneration}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate New Token
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> Generating a new token will break your existing iOS shortcut. 
                        You'll need to update the shortcut with the new URL.
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => generateTokenMutation.mutate()}
                      disabled={generateTokenMutation.isPending}
                      className="w-full mt-2"
                    >
                      {generateTokenMutation.isPending ? "Generating..." : "I Understand - Generate New Token"}
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <div className="text-center py-4">
                <Button
                  onClick={() => generateTokenMutation.mutate()}
                  disabled={generateTokenMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generateTokenMutation.isPending ? "Generating..." : "Generate Personal Token"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
