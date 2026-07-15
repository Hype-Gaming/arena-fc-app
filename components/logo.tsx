import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({
  className,
  iconOnly = false,
}: {
  className?: string
  iconOnly?: boolean
}) {
  if (iconOnly) {
    return (
      <Image
        src="/premier-mark.png"
        alt="Arena FC"
        width={36}
        height={36}
        className={cn("h-9 w-9 object-contain", className)}
        priority
      />
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/premier-mark.png"
        alt="Arena FC"
        width={40}
        height={40}
        className="h-10 w-10 object-contain"
        priority
      />
      <span className="text-2xl font-extrabold italic tracking-tight">
        <span className="text-brand-green">ARENA</span>FC
      </span>
    </div>
  )
}
