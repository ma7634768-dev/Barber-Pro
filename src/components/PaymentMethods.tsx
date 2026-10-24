import { Barcode, CreditCard, QrCode } from "lucide-react";
import { cn } from "./ui";

const METHODS = [
  { icon: QrCode, label: "Pix" },
  { icon: Barcode, label: "Boleto" },
  { icon: CreditCard, label: "Cartão de crédito" },
];

export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {METHODS.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </span>
      ))}
    </div>
  );
}
