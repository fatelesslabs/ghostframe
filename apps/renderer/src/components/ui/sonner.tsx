import { Toaster as Sonner, type ToasterProps } from "sonner";
import React from "react";

// Minimal Toaster wrapper tailored for this project (no next-themes).
// Defaults to dark theme and exposes Sonner's Toaster props.
const Toaster = ({ theme = "dark", ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "rgba(17,17,17,0.9)",
          "--normal-text": "#E5E7EB",
          "--normal-border": "rgba(255,255,255,0.12)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
