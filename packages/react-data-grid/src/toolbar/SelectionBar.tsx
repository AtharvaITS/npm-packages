import { useGrid } from '../state/GridContext';

/** Selected count, "Select all N" and Clear (FR-027, data model §8). */
export function SelectionBar() {
  const ctx = useGrid();
  const { selection, messages } = ctx;
  const count = selection.selected.size;
  if (selection.mode === 'none' || count === 0) return null;
  const allSelected = selection.headerState === 'all';
  return (
    <div className="aits-selection-bar">
      <span className="aits-selection-count">
        {ctx.serverMode && allSelected
          ? messages.allOnPageSelected(selection.selectableCount)
          : messages.selectedCount(count)}
      </span>
      {selection.mode === 'multi' && !allSelected && selection.selectableCount > 0 && (
        <button
          type="button"
          className="aits-button aits-button-quiet"
          onClick={selection.selectAll}
        >
          {messages.selectAllMatching(selection.selectableCount)}
        </button>
      )}
      <button type="button" className="aits-button aits-button-quiet" onClick={selection.clear}>
        {messages.clearSelection}
      </button>
    </div>
  );
}
