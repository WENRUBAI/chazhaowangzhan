"use client";

import React, { useRef, useState, MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/ui/cn";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  glowColor?: string;
}

export function SpotlightCard({
  children,
  className,
  href,
  glowColor = "rgba(0, 243, 255, 0.25)", // Neon Cyan glow by default
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<any>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<any>) => {
    if (!divRef.current) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(1);
  };

  const handleBlur = () => {
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  // 动态选择组件：如果有 href 则使用 Link，否则使用 div
  const Component: any = href ? Link : "div";
  // 如果是 Link，需要传递 href
  const componentProps = href ? { href, ...props } : props;

  return (
    <Component
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-surface/50 p-6 text-foreground shadow-sm transition-all duration-300",
        "hover:border-neon-cyan/50 hover:bg-surface-2 hover:shadow-neon",
        className
      )}
      {...componentProps}
    >
      {/* 默认的微弱环境光 - 模拟玻璃边缘反光 */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      
      {/* 鼠标跟随的高亮光斑 */}
      <div
        className="pointer-events-none absolute -inset-px z-10 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />
      
      {/* 内容层，确保在光斑之上 */}
      <div className="relative z-20">{children}</div>
    </Component>
  );
}
