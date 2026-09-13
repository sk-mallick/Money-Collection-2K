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
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500 dark:text-emerald-400 shrink-0" />,
        info: <InfoIcon className="size-4 text-sky-500 dark:text-sky-400 shrink-0" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500 dark:text-amber-400 shrink-0" />,
        error: <OctagonXIcon className="size-4 text-rose-500 dark:text-rose-400 shrink-0" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/30 group-[.toaster]:backdrop-blur-md group-[.toaster]:rounded-xl group-[.toaster]:py-2.5 group-[.toaster]:px-3.5 group-[.toaster]:gap-2.5 group-[.toaster]:items-center group-[.toaster]:min-h-[42px] group-[.toaster]:w-[356px] group-[.toaster]:max-w-[356px]",
          title:
            "group-[.toast]:text-[13px] group-[.toast]:font-medium group-[.toast]:text-foreground leading-snug tracking-tight whitespace-nowrap",
          description: "hidden",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-2.5 group-[.toast]:py-1 group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-2.5 group-[.toast]:py-1 group-[.toast]:rounded-md",
          closeButton:
            "!bg-transparent hover:!bg-accent !text-muted-foreground hover:!text-foreground !border-none !rounded-md !size-6 !static !transform-none !ml-auto !mr-0 !transition-all !opacity-60 hover:!opacity-100 flex items-center justify-center shrink-0 cursor-pointer",
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
