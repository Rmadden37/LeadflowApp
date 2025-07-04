
"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

export default function AetherHeader() {
  return (
    <div className="flex justify-between items-center p-6 pt-8">
      <h1 className="text-4xl font-lora text-[var(--text-primary)]">Dashboard</h1>
      <div className="flex items-center space-x-3">
        {/* Create Lead Button */}
        <Link href="/dashboard/create-lead">
          <button 
            className="w-10 h-10 rounded-full frosted-glass-card flex items-center justify-center hover:scale-105 transition-transform duration-200 hover:bg-white/5"
            aria-label="Create New Lead"
          >
            <Plus className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </Link>
      </div>
    </div>
  );
}
