'use client';

import React from 'react';
import { Calendar, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface SOPExpiryBadgeProps {
  expiresAt?: string;
  lastReviewedAt?: string;
  reviewCycleMonths?: number;
}

export function SOPExpiryBadge({ expiresAt, lastReviewedAt, reviewCycleMonths }: SOPExpiryBadgeProps) {
  if (!expiresAt) return null;

  const now = new Date();
  const expireDate = new Date(expiresAt);
  const diffDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
        <span>หมดอายุแล้ว (ต้องรับการตรวจสอบใหม่ด่วน)</span>
      </span>
    );
  }

  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span>ใกล้หมดอายุ (เหลือ {diffDays} วัน)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      <span>ข้อมูลถูกต้อง (รอบทบทวน {reviewCycleMonths || 6} เดือน)</span>
    </span>
  );
}
