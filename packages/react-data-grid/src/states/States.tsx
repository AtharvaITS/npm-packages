import type { ReactNode } from 'react';
import type { StateContent, StateContentContext } from '../types';

export function renderStateContent(
  content: StateContent | undefined,
  ctx: StateContentContext,
  fallback: ReactNode,
) {
  if (content === undefined) return fallback;
  if (typeof content === 'function') return content(ctx);
  return content;
}
