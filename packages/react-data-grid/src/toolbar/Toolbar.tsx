import { useGrid } from '../state/GridContext';
import { ColumnsButton } from './ColumnsButton';
import { FilterPanel } from './FilterPanel';
import { ResultSummary } from './ResultSummary';
import { SearchBox } from './SearchBox';
import { SelectionBar } from './SelectionBar';
import { SortMenu } from './SortMenu';
import { ViewSwitcher } from './ViewSwitcher';

export function Toolbar() {
  const ctx = useGrid();
  const { props, api } = ctx;
  const showSwitcher = props.showViewSwitcher !== false && api.views.length > 1;
  const showSearch = props.searchable !== false;
  const showFilter = props.filterable !== false;
  const showSort = api.state.view !== 'table';

  return (
    <div className="aits-toolbar-wrap">
      <div className="aits-toolbar">
        <div className="aits-toolbar-start">
          {showSearch && <SearchBox />}
          {showFilter && <FilterPanel />}
        </div>
        <div className="aits-toolbar-end">
          {showSort && <SortMenu />}
          <ColumnsButton />
          {showSwitcher && <ViewSwitcher />}
        </div>
      </div>
      <ResultSummary />
      <SelectionBar />
    </div>
  );
}
