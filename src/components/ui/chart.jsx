import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "../../lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" }

export const ChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
}

export const ChartContainer = React.forwardRef(
  ({ id, config, children, className, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    return (
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    )
  }
)
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip

export const ChartTooltipContent = React.forwardRef(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      labelKey,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      ...props
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (!payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = item.payload

      if (!itemConfig) {
        return null
      }

      return {
        [key]: itemConfig[labelKey || item.dataKey || item.name || "value"],
      }
    }, [labelKey, payload])

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md",
          className
        )}
        {...props}
      >
        {tooltipLabel && (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter
              ? labelFormatter(
                  Object.values(tooltipLabel)[0],
                  payload.map((item) => item.payload)
                )
              : Object.values(tooltipLabel)[0]}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = item.payload?.payload?.[key]
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey || index}
                className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
              >
                <div
                  className={cn(
                    "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                    {
                      "my-0.5 w-2.5": indicator === "dot",
                      "w-1": indicator === "line",
                      "my-0.5 w-2.5 rounded-none": indicator === "dashed",
                    }
                  )}
                  style={
                    {
                      "--color-bg": indicatorColor,
                      "--color-border": indicatorColor,
                    } || undefined
                  }
                />
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    item.value < 0 && "text-muted-foreground"
                  )}
                >
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {item.name}
                    </span>
                    {formatter && item?.value !== undefined && item.value !== null ? (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatter(item.value, item.payload)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export const ChartLegend = RechartsPrimitive.Legend

export const ChartLegendContent = React.forwardRef(
  (
    {
      className,
      hideIcon = false,
      payload,
      verticalAlign = "bottom",
      nameKey,
      ...props
    },
    ref
  ) => {
    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-2" : "pt-2",
          className
        )}
        {...props}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              <span className="text-muted-foreground">{item.value}</span>
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

