import React from "react";

export function HeroGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
      <div className="relative flex h-[600px] w-full max-w-[1200px] items-center justify-center">
        {/* Core Glow - Neon Purple */}
        <div className="absolute top-[50px] h-[300px] w-[300px] animate-pulse-slow rounded-full bg-neon-purple/40 blur-[100px] mix-blend-screen" />
        
        {/* Secondary Glow - Neon Cyan */}
        <div className="absolute top-[100px] h-[500px] w-[500px] rounded-full bg-neon-cyan/20 blur-[120px] mix-blend-screen" />
        
        {/* Top Light Beam - Scanning Effect */}
        <div className="absolute -top-[300px] h-[600px] w-[1000px] animate-float bg-gradient-to-b from-neon-purple/20 via-neon-cyan/10 to-transparent blur-[60px]" />
        
        {/* Horizontal Laser Line */}
        <div className="absolute top-[200px] h-[1px] w-full bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50 blur-[1px]" />
        
        {/* Subtle Noise Texture Overlay */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-30 mix-blend-overlay" />
      </div>
    </div>
  );
}
