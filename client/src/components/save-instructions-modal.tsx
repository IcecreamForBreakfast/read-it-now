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
    const token = (user as any)?.user?.personalToken;
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
          <DialogTitle className="text-2xl font-bold text-slate-800">How to Add Articles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Manual Save (Ready Now)</h3>
            <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
              <li>Click the "+ Save Article" button above</li>
              <li>Paste any article URL</li>
              <li>Article will be saved instantly to your collection</li>
            </ol>
            <p className="text-blue-700 text-xs mt-2 italic">This works immediately - no setup required!</p>
          </div>

          {/* iOS Shortcut Integration */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-2 mb-3">
              <Smartphone className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-900">iOS Shortcut Setup (Optional)</h3>
            </div>
            <p className="text-green-800 text-sm mb-3">
              Save articles directly from Safari by setting up a custom iOS shortcut.
            </p>
            
            {(user as any)?.user?.personalToken ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-green-900">iOS Shortcut URL (Copy This)</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={`${window.location.origin}/api/save/${(user as any)?.user?.personalToken}`}
                      readOnly
                      className="bg-white text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShortcutUrl}
                      className="shrink-0 bg-green-600 text-white hover:bg-green-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-green-700 text-xs mt-1">Use this URL in step 5 of the setup instructions below</p>
                </div>

                <div className="bg-green-100 rounded p-3 text-sm text-green-800">
                  <p className="font-medium mb-2">Complete iOS Shortcut Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Copy the iOS Shortcut URL above</li>
                    <li>Open the Shortcuts app on your iPhone</li>
                    <li>Tap the "+" to create a new shortcut</li>
                    <li>Tap "Add Action" and search for "Get Contents of URL"</li>
                    <li>Paste the copied URL in the URL field</li>
                    <li>Set Method to "POST"</li>
                    <li>Add another action: "Get Text from Input"</li>
                    <li>Add "Get URLs from Input" action</li>
                    <li>Connect the URL output to the "Get Contents of URL" request body</li>
                    <li>Tap the settings icon and enable "Use with Share Sheet"</li>
                    <li>Name your shortcut "Read It Later" and save</li>
                    <li>Test by sharing any webpage from Safari</li>
                  </ol>
                  <div className="mt-2 p-2 bg-green-200 rounded text-xs">
                    <strong>Usage:</strong> In Safari, tap Share → Read It Later to save articles instantly!
                  </div>
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
                  className="bg-green-600 hover:bg-green-700"
                >
                  {generateTokenMutation.isPending ? "Generating..." : "Generate Personal Token"}
                </Button>
                <p className="text-green-700 text-xs mt-2">Required to create your custom iOS shortcut</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
