// ESLint flat config (ESM)
import js from '@eslint/js';

const baseRules = {
  'no-unused-vars': ['warn', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_'
  }],
  'no-inner-declarations': 'off'
};

export default [
  {
    ignores: ['node_modules/**', 'coverage/**']
  },
  js.configs.recommended,
  {
    files: ['tampermonkey/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        MutationObserver: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        alert: 'readonly',
        history: 'readonly',
        CustomEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        ResizeObserver: 'readonly',
        GM_setValue: 'readonly',
        GM_getValue: 'readonly',
        GM_deleteValue: 'readonly',
        GM_listValues: 'readonly',
        GM_cookie: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        AbortController: 'readonly',
        XMLHttpRequest: 'readonly',
        module: 'readonly',
        require: 'readonly',
        confirm: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: baseRules
  },
  {
    files: ['__tests__/**/*.js', '__tests__/**/*.cjs', '__tests__/**/*.mjs', '__tests__/**/*.jsx', '__tests__/**/*.ts', '__tests__/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        MutationObserver: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        console: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: baseRules
  },
  {
    files: ['demo/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        window: 'readonly',
        document: 'readonly'
      }
    },
    rules: baseRules
  },
  {
    files: ['**/fixtures/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly'
      }
    },
    rules: baseRules
  }
];
