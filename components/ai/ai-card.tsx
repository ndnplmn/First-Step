'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { GroundingSource } from '@/lib/types';
import { ArrowSquareOut } from '@phosphor-icons/react';

interface AICardProps {
  children: ReactNode;
  sources?: GroundingSource[];
  actions?: ReactNode;
}

export function AICard({ children, sources, actions }: AICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="relative rounded-[20px] p-6 border-l-[3px] border-[var(--color-sage)]"
      style={{
        background: 'linear-gradient(145deg, var(--color-sage-light) 0%, var(--color-violet-light) 100%)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
          style={{ background: 'var(--color-sage)' }}
        />
        <div className="flex-1 space-y-4">
          <div className="leading-relaxed" style={{ color: 'var(--color-deep)' }}>
            {children}
          </div>

          {sources && sources.length > 0 && (
            <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-[11px] font-medium tracking-wide mb-2.5" style={{ color: 'var(--color-muted-soft)' }}>
                Fuentes
              </p>
              <div className="space-y-1.5">
                {sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium hover:underline"
                    style={{ color: 'var(--color-sage)' }}
                  >
                    <ArrowSquareOut size={12} />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {actions && (
            <div className="flex flex-wrap gap-2.5 pt-1">
              {actions}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
