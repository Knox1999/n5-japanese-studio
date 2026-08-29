import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // This app intentionally hydrates local-only state and resets async view state
      // in effects. These effects synchronize browser storage/navigation, rather than
      // deriving render state, so the React compiler's blanket rule is not applicable.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    '_e2e/**',
    'docs/legacy-root/**',
    'public/assets/strokes/**',
  ]),
]);
