import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function ApiKeyManager() {
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const apiKey = user?.user?.apiKey;

  const generateKeyMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/generate-key", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "API Key Generated",
        description: "Your new API key has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate API key. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "API key copied to clipboard.",
    });
  };

  const maskApiKey = (key: string) => {
    if (!key) return "";
    return key.slice(0, 8) + "..." + key.slice(-8);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          Use this key for iOS shortcuts and API access. Keep it secure!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiKey ? (
          <div className="flex items-center space-x-2">
            <Input
              value={showKey ? apiKey : maskApiKey(apiKey)}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(apiKey)}
              title="Copy API key"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="text-muted-foreground">No API key found. Generate one below.</p>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => generateKeyMutation.mutate()}
            disabled={generateKeyMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {apiKey ? "Generate New Key" : "Generate API Key"}
          </Button>
          {generateKeyMutation.isPending && (
            <span className="text-sm text-muted-foreground">Generating...</span>
          )}
        </div>

        {apiKey && (
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Usage:</p>
            <p className="text-muted-foreground">
              Include in HTTP headers: <code>Authorization: Bearer {maskApiKey(apiKey)}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}