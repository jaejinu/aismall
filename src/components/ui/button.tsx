import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/*
 * Figma: Button (5:130)
 * 라벨에는 실제 행동을 쓴다. Primary는 한 화면에 하나. Danger는 되돌리기 어려운 행동에만.
 * Disabled는 처리 중 중복 제출 방지에도 쓴다.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const variantCls: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-secondary text-on-secondary hover:bg-secondary-hover",
  ghost: "text-fg hover:bg-subtle",
  danger: "bg-danger text-on-danger hover:opacity-90",
};

const sizeCls: Record<Size, string> = {
  md: "gap-2 px-4 py-2 text-label-md",
  sm: "gap-1 px-3 py-1 text-label-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  );
}
