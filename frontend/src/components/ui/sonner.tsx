import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={8}
      mobileOffset={{ bottom: 16, left: 12, right: 12 }}
      icons={{
        success: <CircleCheckIcon className="size-4 sm:size-4.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />,
        info: <InfoIcon className="size-4 sm:size-4.5 text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />,
        warning: <TriangleAlertIcon className="size-4 sm:size-4.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />,
        error: <OctagonXIcon className="size-4 sm:size-4.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />,
        loading: <Loader2Icon className="size-4 sm:size-4.5 animate-spin text-muted-foreground shrink-0 mt-0.5" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-2xl group-[.toaster]:shadow-black/30 group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-xl sm:group-[.toaster]:rounded-2xl group-[.toaster]:p-3 sm:group-[.toaster]:py-3 sm:group-[.toaster]:px-4 group-[.toaster]:gap-2.5 sm:group-[.toaster]:gap-3 group-[.toaster]:items-start group-[.toaster]:min-h-[44px] group-[.toaster]:w-[calc(100vw-24px)] group-[.toaster]:max-w-[calc(100vw-24px)] sm:group-[.toaster]:w-[380px] sm:group-[.toaster]:max-w-[380px]",
          title:
            "group-[.toast]:text-[13px] sm:group-[.toast]:text-[13.5px] group-[.toast]:font-medium group-[.toast]:text-foreground leading-snug tracking-tight break-words text-left flex-1 min-w-0 line-clamp-2",
          description:
            "group-[.toast]:text-[11.5px] group-[.toast]:text-muted-foreground leading-relaxed mt-0.5 break-words text-left line-clamp-2",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-2.5 group-[.toast]:py-1.5 group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-2.5 group-[.toast]:py-1.5 group-[.toast]:rounded-lg",
          closeButton:
            "!bg-transparent hover:!bg-accent/80 !text-muted-foreground hover:!text-foreground !border-none !rounded-lg !size-6 !static !transform-none !ml-auto !mr-0 !transition-all !opacity-70 hover:!opacity-100 flex items-center justify-center shrink-0 cursor-pointer mt-0.5",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
