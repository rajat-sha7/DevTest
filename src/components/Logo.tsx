import { cn } from "@/lib/utils";

/** The DevQnA mark: a yellow tile with a code glyph and a hard ink border. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-yellow-300 text-[#0b1020] border-2 border-[#0b1020] font-code font-bold leading-none shrink-0 w-8 h-8 text-sm",
        className
      )}
    >
      {"</>"}
    </span>
  );
}
