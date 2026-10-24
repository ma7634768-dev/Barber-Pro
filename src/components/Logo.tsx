import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Scissors className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        Barber<span className="text-primary">Pro</span>
      </span>
    </Link>
  );
}
