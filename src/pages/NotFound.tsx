import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-7xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">Essa página não existe.</p>
      <Link to="/"><Button variant="outline">Voltar ao início</Button></Link>
    </div>
  );
}
