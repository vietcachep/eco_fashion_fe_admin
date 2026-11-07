/* eslint-disable @next/next/no-img-element */
"use client";
import { PackageIcon } from "lucide-react";

export function ProductThumb({ src }: { src?: string | null }) {
  return (
    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40">
      <PackageIcon className="size-5 text-muted-foreground" />
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}
