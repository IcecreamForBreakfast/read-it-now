import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Smartphone, Globe, Copy, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function HowToSharePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleBack = () => {
    setLocation("/dashboard");
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${description} copied to clipboard`,
    });
  };

  const currentDomain = window.location.origin;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Save Articles from iOS
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Set up your iPhone to save articles directly to your Read-It-Later app from Safari, Chrome, and other browsers
          </p>
        </div>

        {/* Method 1: iOS Shortcut */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5" />
                iOS Shortcut (Recommended)
              </CardTitle>
              <Badge variant="default">Best Option</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Why This Method?</h4>
              <p className="text-blue-800">
                Works in any app, appears in the share sheet, and automatically saves articles with one tap.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Step 1: Get Your API Key</h4>
                <div className="bg-amber-50 p-4 rounded-lg mb-4">
                  <p className="text-amber-800 text-sm">
                    🔑 Your API Key: <code className="font-mono bg-amber-100 px-2 py-1 rounded text-xs">ril_46219cbzc71x4b8dxdd97x73cc546x21</code>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard("ril_46219cbzc71x4b8dxdd97x73cc546x21", "API Key")}
                    className="mt-2"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy API Key
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Step 2: Create the Shortcut</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                  <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
                  <li>Tap the <strong>+</strong> button to create a new shortcut</li>
                  <li>Add these actions in order:</li>
                </ol>
                <div className="ml-4 mt-2 space-y-2">
                  <div className="bg-slate-100 p-3 rounded text-sm">
                    <strong>Action 1:</strong> "Get URLs from Input"
                  </div>
                  <div className="bg-slate-100 p-3 rounded text-sm">
                    <strong>Action 2:</strong> "Get Contents of URL"
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Step 2: Configure the API Call</h4>
                <p className="text-slate-700 mb-2">In the "Get Contents of URL" action, set:</p>
                <div className="space-y-2">
                  <div className="bg-slate-100 p-3 rounded">
                    <strong>URL:</strong> {currentDomain}/api/save
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => copyToClipboard(`${currentDomain}/api/save`, "API URL")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-slate-100 p-3 rounded">
                    <strong>Method:</strong> POST
                  </div>
                  <div className="bg-slate-100 p-3 rounded">
                    <strong>Headers:</strong>
                    <div className="mt-1 font-mono text-xs space-y-1">
                      <div>Content-Type: application/json</div>
                      <div>Authorization: Bearer ril_46219cbzc71x4b8dxdd97x73cc546x21</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard('Content-Type: application/json\nAuthorization: Bearer ril_46219cbzc71x4b8dxdd97x73cc546x21', "Headers")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Headers
                    </Button>
                  </div>
                  <div className="bg-slate-100 p-3 rounded">
                    <strong>Request Body:</strong> JSON
                    <div className="mt-1 font-mono text-xs bg-white p-2 rounded">
                      {`{"url": "URLs"}`}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard('{"url": "URLs"}', "Request body")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy JSON
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Step 3: Enable Share Sheet</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700">
                  <li>Name your shortcut "Save Article"</li>
                  <li>Tap the settings icon</li>
                  <li>Enable "Use with Share Sheet"</li>
                  <li>Select "URLs" and "Safari Web Pages"</li>
                </ol>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Ready to Use</h4>
              <p className="text-green-800">
                Your API key authentication is now configured! This shortcut will work from any app without needing to stay logged in. 
                The API key provides secure access to your account.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Method 2: Bookmarklet */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              Bookmarklet Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">When to Use This</h4>
              <p className="text-green-800">
                Great backup method that works in any browser. Slightly less convenient but very reliable.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 1: Create the Bookmark</h4>
              <div className="bg-slate-100 p-3 rounded">
                <p className="text-sm text-slate-700 mb-2">Copy this JavaScript code:</p>
                <div className="bg-white p-2 rounded font-mono text-xs overflow-x-auto">
                  {`javascript:(function(){var url=encodeURIComponent(window.location.href);var saveUrl='${currentDomain}/dashboard?save='+url;window.open(saveUrl,'_blank');})();`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(
                    `javascript:(function(){var url=encodeURIComponent(window.location.href);var saveUrl='${currentDomain}/dashboard?save='+url;window.open(saveUrl,'_blank');})();`,
                    "Bookmarklet code"
                  )}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Bookmarklet
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 2: Save as Bookmark</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Go to any webpage in Safari</li>
                <li>Tap the Share button</li>
                <li>Select "Add Bookmark"</li>
                <li>Name it "Save Article"</li>
                <li>Replace the URL with the copied JavaScript code</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 3: Usage</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>When reading an article, tap your bookmarks</li>
                <li>Find and tap "Save Article"</li>
                <li>It opens your app with the URL pre-filled</li>
                <li>Tap "Save" to save the article</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Method 3: Manual */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Manual Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-slate-700">For any app or situation:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Copy the article URL</li>
                <li>Open your Read-It-Later app</li>
                <li>Paste the URL and tap Save</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Your App URL:</span>
              <div className="flex items-center space-x-2">
                <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                  {currentDomain}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(currentDomain, "App URL")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">API Endpoint:</span>
              <div className="flex items-center space-x-2">
                <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                  {currentDomain}/api/articles
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`${currentDomain}/api/articles`, "API endpoint")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500">
          <p>Need help? The manual method always works as a backup.</p>
        </div>
      </div>
    </div>
  );
}