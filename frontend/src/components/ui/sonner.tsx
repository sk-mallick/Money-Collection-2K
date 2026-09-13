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
      duration={3000}
      gap={8}
      mobileOffset={{ bottom: 16, left: 16, right: 16 }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500 shrink-0" />,
        info: <InfoIcon className="size-4 text-sky-500 shrink-0" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500 shrink-0" />,
        error: <OctagonXIcon className="size-4 text-rose-500 shrink-0" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-lg group-[.toaster]:shadow-black/25 group-[.toaster]:backdrop-blur-md group-[.toaster]:rounded-lg group-[.toaster]:px-3.5 group-[.toaster]:py-2.5 group-[.toaster]:gap-2.5 group-[.toaster]:items-center group-[.toaster]:min-h-[38px] group-[.toaster]:w-auto group-[.toaster]:min-w-[180px] group-[.toaster]:max-w-[calc(100vw-32px)] sm:group-[.toaster]:max-w-[340px]",
          title:
            "group-[.toast]:text-xs sm:group-[.toast]:text-[13px] group-[.toast]:font-medium group-[.toast]:text-foreground leading-snug break-words text-left flex-1 min-w-0",
          description:
            "group-[.toast]:text-[11.5px] group-[.toast]:text-muted-foreground leading-normal mt-0.5 break-words text-left",
          closeButton:
            "!bg-transparent hover:!bg-accent/80 !text-muted-foreground hover:!text-foreground !border-none !rounded-md !size-5 !static !transform-none !ml-2 !mr-0 !transition-all !opacity-60 hover:!opacity-100 flex items-center justify-center shrink-0 cursor-pointer",
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
