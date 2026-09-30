import { useEffect, useRef, useState } from 'react';
import { useGrid } from '../state/GridContext';
import { CloseIcon, SearchIcon } from '../views/icons';

/** Search input; the committed search updates after a pause (FR-018, default 200 ms). */
export function SearchBox() {
  const ctx = useGrid();
  const committed = ctx.api.state.search;
  const [text, setText] = useState(committed);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const delay = ctx.props.searchDebounceMs ?? 200;
  const setSearch = ctx.api.setSearch;
  const lastCommitted = useRef(committed);

  // External changes (Clear all, controlled prop) update the input.
  useEffect(() => {
    if (committed !== lastCommitted.current) {
      lastCommitted.current = committed;
      setText(committed);
    }
  }, [committed]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const commit = (value: string, immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    const run = () => {
      lastCommitted.current = value;
      setSearch(value);
    };
    if (immediate || delay <= 0) run();
    else timer.current = setTimeout(run, delay);
  };

  return (
    <div className="aits-search" role="search">
      <SearchIcon />
      <input
        type="search"
        className="aits-search-input"
        aria-label={ctx.messages.searchLabel}
        placeholder={ctx.messages.searchPlaceholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(text, true);
          if (e.key === 'Escape' && text) {
            e.preventDefault();
            setText('');
            commit('', true);
          }
        }}
      />
      {text && (
        <button
          type="button"
          className="aits-icon-button aits-search-clear"
          aria-label={ctx.messages.clearSearch}
          onClick={() => {
            setText('');
            commit('', true);
          }}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
