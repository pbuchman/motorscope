# Coding Conventions

## File Naming

| Type             | Convention                  | Example                                 |
|------------------|-----------------------------|-----------------------------------------|
| React Components | PascalCase                  | `CarCard.tsx`, `PriceChart.tsx`         |
| Hooks            | camelCase with `use` prefix | `usePageContent.ts`, `useCurrentTab.ts` |
| Services         | camelCase                   | `geminiService.ts`, `refreshService.ts` |
| Utilities        | camelCase                   | `formatters.ts`                         |
| Types            | camelCase or PascalCase     | `types.ts`, `CarListing`                |
| Config           | camelCase                   | `marketplaces.ts`, `config.ts`          |
| Tests            | `*.test.ts` or `*.test.tsx` | `auth.test.ts`                          |

## Export Style

### Named Exports (Preferred)

Use named exports for most modules:

```typescript
// Good - named exports
export const usePageContent = () => { ...
};
export const formatEuropeanDateTime = () => { ...
};
export {GoogleLogo} from './GoogleLogo';
```

### Default Exports

Use default exports only for:

- Top-level page components
- Lazy-loaded route components

```typescript
// App.tsx
const App: React.FC = () => { ...
};
export default App;

// Components loaded via lazy()
const Dashboard: React.FC = () => { ...
};
export default Dashboard;
```

## Import Order

Organize imports in this order, with blank lines between groups:

```typescript
// 1. React and core libraries
import React, {useState, useEffect, useCallback} from 'react';

// 2. Third-party libraries
import {Loader2, Settings, Car} from 'lucide-react';

// 3. Internal imports using @/ alias - contexts/hooks first
import {useAuth} from '@/auth/AuthContext';
import {useListings} from '@/context/AppContext';
import {usePageContent} from '@/hooks';

// 4. Internal imports using @/ alias - components
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import CarCard from '@/components/CarCard';

// 5. Internal imports using @/ alias - services/utils/types
import {formatEuropeanDateTime} from '@/utils/formatters';
import {CarListing} from '@/types';
```

## Path Aliases

The project uses `@/` as an alias for `src/`. This is configured in both:

- `tsconfig.json` - for TypeScript/IDE support
- `vite.config.ts` - for build resolution

**Always prefer `@/` imports over relative paths:**

```typescript
// ✅ Good - use @/ alias
import {CarListing} from '@/types';
import {useAuth} from '@/auth/AuthContext';
import CarCard from '@/components/CarCard';

// ❌ Avoid - relative paths (except for sibling files in same folder)
import {CarListing} from '../../types';
import {useAuth} from '../auth/AuthContext';
```

**Exception:** Use relative imports for files in the same directory:

```typescript
// In src/components/popup/index.ts - OK to use relative
export {LoginView} from './LoginView';
export {PreviewCard} from './PreviewCard';
```

## Component Structure

### Functional Components Only

All components should be functional components with hooks:

```typescript
// Good
const MyComponent: React.FC<Props> = ({prop1, prop2}) => {
    const [state, setState] = useState();
    // ...
};

// Bad - class components
class MyComponent extends React.Component {
...
}
```

### Component File Structure

```typescript
/**
 * ComponentName
 *
 * Brief description of what this component does.
 */

import React from 'react';
// ... other imports

// Types (if not imported)
interface Props {
    // ...
}

// Helper functions (if small, otherwise move to utils)
const helperFunction = () => { ...
};

// Component
export const ComponentName: React.FC<Props> = ({...}) => {
    // Hooks first
    const [state, setState] = useState();
    const contextValue = useContext(MyContext);

    // Derived values
    const derivedValue = useMemo(() =>
...,
    [deps]
)
    ;

    // Callbacks
    const handleClick = useCallback(() =>
...,
    [deps]
)
    ;

    // Effects
    useEffect(() => { ...
    }, [deps]);

    // Render
    return (
... )
    ;
};
```

## Hooks

### Custom Hook Structure

```typescript
/**
 * useHookName
 *
 * Description of what this hook does.
 *
 * @param param - Description
 * @returns Description of return value
 */
export const useHookName = (param: Type): ReturnType => {
        // Implementation
    };
```

### Hook Rules

1. Always start with `use` prefix
2. Return object for multiple values (not array)
3. Include loading and error states when fetching data

```typescript
// Good - object return
return {
    data,
    isLoading,
    error,
    refresh,
};

// Avoid for complex returns
return [data, isLoading, error, refresh];
```

## State Management

### Local State

Use `useState` for component-local UI state:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
```

### Context

Use context for:

- Authentication state
- Global app data (listings, settings)
- Theme/preferences

Do NOT use context for:

- Form state
- UI state (modals, dropdowns)
- Data that only one component needs

### Memoization

Use `useMemo` and `useCallback` when:

- Computing derived data from large arrays
- Preventing unnecessary child re-renders
- Passing callbacks to memoized children

```typescript
// Good - expensive computation
const filteredListings = useMemo(() =>
        listings.filter(l => l.status === filter),
    [listings, filter]
);

// Good - callback passed to child
const handleRemove = useCallback((id: string) => {
    remove(id);
}, [remove]);

// Unnecessary - simple values
const title = useMemo(() => 'My Title', []); // Don't do this
```

## TypeScript

### Prop Types

Define interfaces for component props:

```typescript
interface CarCardProps {
    listing: CarListing;
    onRemove: (id: string) => void;
    isRefreshing: boolean;
}
```

### Avoid `any`

```typescript
// Bad
const data: any = response.json();

// Good
const data: CarListing = response.json();
// or
const data = response.json() as CarListing;
```

### Optional Properties

```typescript
interface Props {
    required: string;
    optional?: number;  // May be undefined
}
```

## Styling

### Tailwind CSS

Use Tailwind utility classes:

```tsx
// Good
<div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow">

    // Avoid inline styles
    <div style={{display: 'flex', padding: '16px'}}>
```

### Conditional Classes

```tsx
// Good - template literal
<div className={`btn ${isActive ? 'btn-active' : 'btn-inactive'}`}>

    // Good - join
    <div className={[
        'btn',
        isActive && 'btn-active',
        isDisabled && 'btn-disabled',
    ].filter(Boolean).join(' ')}>
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
    const result = await apiCall();
    setData(result);
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'An error occurred';
    setError(message);
}
```

### Error Boundaries

Wrap major sections with ErrorBoundary:

```tsx
<ErrorBoundary>
    <MainContent/>
</ErrorBoundary>
```

## Comments

### When to Comment

- Complex business logic
- Non-obvious workarounds
- Public API (hooks, utilities)

### JSDoc Style

```typescript
/**
 * Parse car listing data from page content using Gemini AI.
 *
 * @param url - The listing URL
 * @param content - Page text content
 * @returns Parsed car listing data
 * @throws {Error} If Gemini API fails
 */
export const parseCarDataWithGemini = async (
        url: string,
        content: string
    ): Promise<CarListing> => { ...
    };
```

## Adding New Features

### New Component

1. Create file in appropriate folder (`ui/`, `popup/`, etc.)
2. Export from folder's `index.ts`
3. Import using folder path

### New Hook

1. Create in `src/hooks/`
2. Add export to `src/hooks/index.ts`
3. Document with JSDoc

### New Service

1. Create folder if complex (`src/services/newService/`)
2. Create `index.ts` for exports
3. Keep implementation files focused

