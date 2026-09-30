# @atharvaits/react-data-grid

[![npm](https://img.shields.io/npm/v/@atharvaits/react-data-grid)](https://www.npmjs.com/package/@atharvaits/react-data-grid)
[![CI](https://github.com/AtharvaITS/npm-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/AtharvaITS/npm-packages/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@atharvaits/react-data-grid)](./LICENSE)

**ReactDataGrid** is a React component that shows any array of records as a **table**, a **card grid**, or a **list**. Pass your data and get a working grid with no configuration.

## Features

- Three views (table, card grid and list), switchable by the user
- Sorting, search and typed filters
- Pagination, or virtual scrolling for 100,000+ rows
- Server-side data mode for large data sets
- Row selection, and column resize, reorder, hide and pin
- Saved user preferences
- Theming with CSS variables, plus light and dark modes
- Localization and right-to-left layouts
- Keyboard and screen-reader support (targets WCAG 2.2 AA)
- Server-side rendering support
- TypeScript types included, no runtime dependencies, about 38 KB gzipped

## Installation

```bash
npm install @atharvaits/react-data-grid
```

Requires `react` and `react-dom` 18 or later.

## Quick start

```tsx
import { ReactDataGrid } from '@atharvaits/react-data-grid';
import '@atharvaits/react-data-grid/styles.css';

const people = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer', active: true },
  { id: 2, name: 'Alan Turing', role: 'Researcher', active: false },
];

export function People() {
  return <ReactDataGrid data={people} getRowId="id" />;
}
```

## Documentation

See the [package documentation](./packages/react-data-grid/README.md) for columns, views, sorting and filtering, server mode, selection, theming, localization, accessibility and the full props reference.

## License

[MIT](./LICENSE)
