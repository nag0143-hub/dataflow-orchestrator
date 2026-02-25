import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

export default function EmptyStateGuide({ icon: Icon, title, description, primaryAction, secondaryLinks }) {
  return (
    <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <CardContent className="py-16 text-center">
        {Icon && <Icon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} className="gap-2">
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
          {secondaryLinks && secondaryLinks.length > 0 && (
            <div className="flex gap-2">
              {secondaryLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}