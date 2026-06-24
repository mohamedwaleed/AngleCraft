"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Upload, Link as LinkIcon, ImageIcon, Loader2 } from "lucide-react";

type Mode = "url" | "photo";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function ProductInput() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFile = useCallback(() => {
    setFile(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  function handleFileChange(selected: File | null) {
    setError(null);
    if (!selected) {
      resetFile();
      return;
    }
    if (selected.size > MAX_PHOTO_BYTES) {
      setError("Photo must be 10 MB or smaller.");
      resetFile();
      return;
    }
    if (
      selected.type &&
      !ACCEPTED_PHOTO_TYPES.includes(selected.type.toLowerCase())
    ) {
      setError("Photo must be PNG, JPG, or WEBP.");
      resetFile();
      return;
    }
    setFile(selected);
    setFileName(selected.name);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange(e.target.files?.[0] ?? null);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files?.[0] ?? null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    if (next === "url") resetFile();
    else setUrl("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "url") {
      if (!url.trim()) {
        setError("Please paste a product URL.");
        return;
      }
      try {
        new URL(url.trim());
      } catch {
        setError("That doesn't look like a valid URL.");
        return;
      }
    } else if (!file) {
      setError("Please upload a product photo.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (mode === "url") {
        formData.append("url", url.trim());
      } else {
        formData.append("photo", file as File);
      }

      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/status");
    } catch (err) {
      console.error("extract submit failed:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F5F9] p-1">
        <button
          type="button"
          onClick={() => switchMode("url")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
            mode === "url"
              ? "bg-white text-[#0F172A] shadow-sm"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <LinkIcon className="size-4" />
          Product URL
        </button>
        <button
          type="button"
          onClick={() => switchMode("photo")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
            mode === "photo"
              ? "bg-white text-[#0F172A] shadow-sm"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <ImageIcon className="size-4" />
          Upload Photo
        </button>
      </div>

      {mode === "url" ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">
            Product URL
          </label>
          <p className="text-[11px] text-[#94A3B8] -mt-0.5">
            Paste any product page — Amazon, Shopify, your own site, etc.
          </p>
          <Input
            type="url"
            placeholder="https://your-product-link.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={submitting}
            className="h-11 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-[15px] px-4 placeholder:text-[#CBD5E1] focus-visible:border-indigo-400 focus-visible:ring-indigo-400/20 focus-visible:bg-white transition-colors"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#0F172A] uppercase tracking-wide">
            Product Photo
          </label>
          <p className="text-[11px] text-[#94A3B8] -mt-0.5">
            Upload a clear product image. We&apos;ll analyze it with AI.
          </p>
          <label
            htmlFor="file-upload"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed bg-[#F8FAFC] transition-all cursor-pointer py-8 px-6 group ${
              isDragging
                ? "border-indigo-400 bg-indigo-50/60"
                : "border-[#E2E8F0] hover:border-indigo-300 hover:bg-indigo-50/40"
            }`}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-white border border-[#E2E8F0] shadow-sm group-hover:border-indigo-200 transition-colors">
              <Upload className="size-5 text-[#94A3B8] group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="text-center">
              {fileName ? (
                <p className="text-sm font-semibold text-indigo-600 break-all">
                  {fileName}
                </p>
              ) : (
                <p className="text-sm font-semibold text-[#0F172A]">
                  Upload product image
                </p>
              )}
              {!fileName && (
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  or drag &amp; drop &bull; PNG, JPG, WEBP up to 10 MB
                </p>
              )}
            </div>
          </label>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={onFileInputChange}
            disabled={submitting}
          />
          {fileName && (
            <button
              type="button"
              onClick={resetFile}
              className="self-start text-xs font-medium text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              Remove file
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="gap-2 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-base font-semibold shadow-md shadow-indigo-100 transition-all hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Starting analysis…
          </>
        ) : (
          <>
            Get My Free Ad Strategy
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-[#94A3B8]">
        No signup required &bull; Takes 30 seconds
      </p>
    </form>
  );
}
