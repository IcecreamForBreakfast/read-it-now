import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SaveInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveInstructionsModal({ isOpen, onClose }: SaveInstructionsModalProps) {
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

          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">API Endpoint for Automation</h3>
            <p className="text-slate-800 text-sm mb-2">
              For iOS Shortcuts or custom integrations, use this endpoint:
            </p>
            <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
              POST {window.location.origin}/api/save
            </code>
            <p className="text-slate-600 text-xs mt-2">
              Send JSON: {"{"}"url": "https://example.com/article"{"}"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
