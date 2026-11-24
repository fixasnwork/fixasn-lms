import { Spinner } from "@/components/shadcn/spinner";
import { cn } from "@/lib/utils";

export default function PageLoading({
  label = "Memuat halaman...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" className={cn("absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] text-center md:pb-0", className)}>
      <Spinner aria-hidden="true" role="presentation" aria-label={undefined} className="size-8 text-brand-secondary motion-reduce:animate-none" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
