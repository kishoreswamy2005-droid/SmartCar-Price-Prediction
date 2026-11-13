import { Link } from "react-router-dom";
import { SearchX, ArrowLeft, Home } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20">
        <SearchX className="h-10 w-10" />
      </div>
      <h1 className="mt-7 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
        404
      </h1>
      <p className="mt-3 text-lg font-medium tracking-tight">Page not found</p>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div className="mt-7 flex gap-3">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFound;
