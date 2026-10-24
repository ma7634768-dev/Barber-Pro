import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
        <Scissors className="h-5 w-5" />
      </span>
      <span className="text-xl font-bold tracking-tight">
        Barber<span className="text-primary">Pro</span>
      </span>
    </Link>
  );
}
