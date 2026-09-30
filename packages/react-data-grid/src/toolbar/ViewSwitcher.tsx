import { useRef, type KeyboardEvent, type ReactElement } from 'react';
import { useGrid } from '../state/GridContext';
import type { ViewType } from '../types';
import { GridIcon, ListIcon, TableIcon } from '../views/icons';

const ICONS: Record<ViewType, () => ReactElement> = {
  table: TableIcon,
  grid: GridIcon,
  list: ListIcon,
};

/** Segmented control (radiogroup) for choosing the view (FR-010). */
export function ViewSwitcher() {
  const ctx = useGrid();
  const { views, state, setView } = ctx.api;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labels: Record<ViewType, string> = {
    table: ctx.messages.viewTable,
    grid: ctx.messages.viewGrid,
    list: ctx.messages.viewList,
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const forward = ctx.rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = ctx.rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (event.key === forward || event.key === 'ArrowDown') next = (index + 1) % views.length;
    else if (event.key === back || event.key === 'ArrowUp')
      next = (index - 1 + views.length) % views.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = views.length - 1;
    if (next === -1) return;
    event.preventDefault();
    setView(views[next]!);
    refs.current[next]?.focus();
  };

  return (
    <div
      className="aits-view-switcher"
      role="radiogroup"
      aria-label={ctx.messages.viewSwitcherLabel}
    >
      {views.map((view, i) => {
        const Icon = ICONS[view];
        const checked = state.view === view;
        return (
          <button
            key={view}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="aits-view-option"
            data-view-option={view}
            onClick={() => setView(view)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <Icon />
            <span className="aits-view-option-label">{labels[view]}</span>
          </button>
        );
      })}
    </div>
  );
}
