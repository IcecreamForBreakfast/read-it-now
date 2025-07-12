import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Smartphone, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TokenManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInstructions, setShowInstructions] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Debug: Log user data to see what's being returned
  console.log("TokenManager - User data:", user);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          iOS Sharing Setup
        </CardTitle>
        <CardDescription>
          Create a personal token to save articles directly from your iPhone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user?.user?.personalToken ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Personal Token</Label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  value={user.user.personalToken}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToken(user.user.personalToken!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shortcut-url">Shortcut URL</Label>
              <div className="flex gap-2">
                <Input
                  id="shortcut-url"
                  value={`${window.location.origin}/api/save/${user.user.personalToken}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyShortcutUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                <Info className="h-4 w-4 mr-2" />
                Setup Instructions
              </Button>
              <Button
                variant="outline"
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Token
              </Button>
            </div>

            {showInstructions && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="mt-2">
                  <div className="space-y-2 text-sm">
                    <p><strong>iOS Shortcut Setup:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Open the Shortcuts app on your iPhone</li>
                      <li>Tap "+" to create a new shortcut</li>
                      <li>Add "Get URLs from Input" action</li>
                      <li>Add "Get Contents of URL" action with these settings:</li>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Method: POST</li>
                        <li>URL: Copy the "Shortcut URL" above</li>
                        <li>Headers: Content-Type: application/json</li>
                        <li>Request Body: {`{"url": "URL from previous action"}`}</li>
                      </ul>
                      <li>Enable "Use with Share Sheet" in settings</li>
                      <li>Name your shortcut "Save Article"</li>
                    </ol>
                    <p className="mt-2"><strong>Usage:</strong> Share any webpage → Select "Save Article" → Done!</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Generate a personal token to enable iOS sharing
            </p>
            <Button
              onClick={() => generateTokenMutation.mutate()}
              disabled={generateTokenMutation.isPending}
            >
              {generateTokenMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Generate Token
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}