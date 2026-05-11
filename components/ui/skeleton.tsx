'use client';

import { motion, useReducedMotion } from 'motion/react';

interface SkeletonProps {
  height?: number | string;
  width?: string;
  rounded?: string;
  className?: string;
}

export function Skeleton({
  height = 16,
  width = '100%',
  rounded = 'var(--radius-inner)',
  className = '',
}: SkeletonProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={{
        height,
        width,
        borderRadius: rounded,
        background: 'var(--color-elevated)',
        flexShrink: 0,
      }}
      animate={shouldReduce ? { opacity: 0.6 } : { opacity: [0.4, 0.8, 0.4] }}
      transition={
        shouldReduce
          ? { duration: 0 }
          : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
      }
    />
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div
      className="p-4 rounded-[var(--radius-card)]"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <Skeleton height={14} width="55%" className="mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={11}
          width={i === lines - 1 ? '38%' : '100%'}
          className="mb-2"
        />
      ))}
    </div>
  );
}

export function SkeletonTimeline({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center flex-shrink-0 pt-1">
            <Skeleton height={12} width="12px" rounded="9999px" />
            <div className="w-px flex-1 min-h-[40px]" style={{ background: 'var(--color-border)' }} />
          </div>
          <div className="flex-1 pb-4">
            <SkeletonCard lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}
