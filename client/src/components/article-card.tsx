import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Article } from "@shared/schema";

interface ArticleCardProps {
  article: Article;
  onDelete: (id: string) => void;
}

export function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = () => {
    setLocation(`/reader/${article.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(article.id);
  };

  const getTagColor = (tag: string) => {
    if (tag === "untagged") return "bg-gray-100 text-gray-800";
    if (tag === "work") return "bg-blue-100 text-blue-800";
    if (tag === "personal") return "bg-green-100 text-green-800";
    if (tag === "tech") return "bg-amber-100 text-amber-800";
    return "bg-slate-100 text-slate-800";
  };

  return (
    <article
      onClick={handleCardClick}
      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-sm text-slate-600 mb-2">{article.domain}</p>
            <p className="text-xs text-slate-500">
              Saved {formatDistanceToNow(new Date(article.savedAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTagColor(article.tag)}`}>
            {article.tag}
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
