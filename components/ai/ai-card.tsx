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
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative rounded-2xl p-5 border-l-[3px] border-[var(--color-sage)]"
      style={{
        background: 'linear-gradient(135deg, var(--color-sage-light), var(--color-violet-light))',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)] mt-2 flex-shrink-0" />
        <div className="flex-1 space-y-4">
          <div className="text-[var(--color-deep)] leading-relaxed">
            {children}
          </div>

          {sources && sources.length > 0 && (
            <div className="pt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-muted)] mb-2">Fuentes</p>
              <div className="space-y-1">
                {sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[var(--color-sage)] hover:underline"
                  >
                    <ArrowSquareOut size={12} />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {actions && (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
