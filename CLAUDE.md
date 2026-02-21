# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript/TypeScript project optimized for modern web development. The project uses industry-standard tools and follows best practices for scalable application development.

## Development Commands

### Package Management
- `npm install` or `yarn install` - Install dependencies
- `npm ci` or `yarn install --frozen-lockfile` - Install dependencies for CI/CD
- `npm update` or `yarn upgrade` - Update dependencies

### Build Commands
- `npm run build` - Build the project for production
- `npm run dev` or `npm start` - Start development server
- `npm run preview` - Preview production build locally

### Testing Commands
- `npm test` or `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:e2e` - Run end-to-end tests

### Code Quality Commands
- `npm run lint` - Run ESLint for code linting
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

### Development Tools
- `npm run storybook` - Start Storybook (if available)
- `npm run analyze` - Analyze bundle size
- `npm run clean` - Clean build artifacts

## Technology Stack

### Core Technologies
- **JavaScript/TypeScript** - Primary programming languages
- **Node.js** - Runtime environment
- **npm/yarn** - Package management

### Common Frameworks
- **React** - UI library with hooks and functional components
- **Vue.js** - Progressive framework for building user interfaces
- **Angular** - Full-featured framework for web applications
- **Express.js** - Web application framework for Node.js
- **Next.js** - React framework with SSR/SSG capabilities

### Build Tools
- **Vite** - Fast build tool and development server
- **Webpack** - Module bundler
- **Rollup** - Module bundler for libraries
- **esbuild** - Extremely fast JavaScript bundler

### Testing Framework
- **Jest** - JavaScript testing framework
- **Vitest** - Fast unit test framework
- **Testing Library** - Simple and complete testing utilities
- **Cypress** - End-to-end testing framework
- **Playwright** - Cross-browser testing

### Code Quality Tools
- **ESLint** - JavaScript/TypeScript linter
- **Prettier** - Code formatter
- **TypeScript** - Static type checking
- **Husky** - Git hooks

## Project Structure Guidelines

### File Organization
```
src/
├── components/     # Reusable UI components
├── pages/         # Page components or routes
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── services/      # API calls and external services
├── types/         # TypeScript type definitions
├── constants/     # Application constants
├── styles/        # Global styles and themes
└── tests/         # Test files
```

### Naming Conventions
- **Files**: Use kebab-case for file names (`user-profile.component.ts`)
- **Components**: Use PascalCase for component names (`UserProfile`)
- **Functions**: Use camelCase for function names (`getUserData`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (`API_BASE_URL`)
- **Types/Interfaces**: Use PascalCase with descriptive names (`UserData`, `ApiResponse`)

## TypeScript Guidelines

### Type Safety
- Enable strict mode in `tsconfig.json`
- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use union types for multiple possible values
- Avoid `any` type - use `unknown` when type is truly unknown

### Best Practices
- Use type guards for runtime type checking
- Leverage utility types (`Partial`, `Pick`, `Omit`, etc.)
- Create custom types for domain-specific data
- Use enums for finite sets of values
- Document complex types with JSDoc comments

## Code Quality Standards

### ESLint Configuration
- Use recommended ESLint rules for JavaScript/TypeScript
- Enable React-specific rules if using React
- Configure import/export rules for consistent module usage
- Set up accessibility rules for inclusive development

### Prettier Configuration
- Use consistent indentation (2 spaces recommended)
- Set maximum line length (80-100 characters)
- Use single quotes for strings
- Add trailing commas for better git diffs

### Testing Standards
- Aim for 80%+ test coverage
- Write unit tests for utilities and business logic
- Use integration tests for component interactions
- Implement e2e tests for critical user flows
- Follow AAA pattern (Arrange, Act, Assert)

## Performance Optimization

### Bundle Optimization
- Use code splitting for large applications
- Implement lazy loading for routes and components
- Optimize images and assets
- Use tree shaking to eliminate dead code
- Analyze bundle size regularly

### Runtime Performance
- Implement proper memoization (React.memo, useMemo, useCallback)
- Use virtualization for large lists
- Optimize re-renders in React applications
- Implement proper error boundaries
- Use web workers for heavy computations

## Security Guidelines

### Dependencies
- Regularly audit dependencies with `npm audit`
- Keep dependencies updated
- Use lock files (`package-lock.json`, `yarn.lock`)
- Avoid dependencies with known vulnerabilities

### Code Security
- Sanitize user inputs
- Use HTTPS for API calls
- Implement proper authentication and authorization
- Store sensitive data securely (environment variables)
- Use Content Security Policy (CSP) headers

## AI Agent Tools

### LazyLoadingAI - Code Context Optimizer

**LazyLoadingAI** es un servidor MCP (Model Context Protocol) que permite a los agentes de código entender codebases enormes sin desperdiciar tokens de contexto.

#### Instalación Global
```bash
npm install -g lazyloadingai
cd your-project
lazyloadingai init
```

#### ¿Qué hace?

LazyLoadingAI indexa tu codebase y genera "manifests" ligeros que contienen solo las firmas de funciones, clases e interfaces, sin el código de implementación. Esto permite:

1. **Búsqueda semántica**: Encuentra funciones/clases relevantes sin leer todos los archivos
2. **Carga perezosa**: El agente solo carga el código completo cuando lo necesita
3. **Reducción de tokens**: Hasta 48% menos tokens consumidos por sesión
4. **Mayor velocidad**: 1.7x más rápido en tareas de análisis de código

#### Cómo funciona internamente

| Componente | Descripción |
|------------|-------------|
| **Indexador** | Parsea TypeScript/Python con tree-sitter y ts-morph |
| **Base de datos SQLite** | Almacena firmas, tipos y referencias |
| **Motor de búsqueda** | Fuse.js para búsqueda fuzzy de símbolos |
| **Servidor MCP** | Expone herramientas al agente vía Model Context Protocol |

#### Herramientas MCP disponibles

- `search_symbols`: Busca funciones/clases por nombre o patrón
- `get_signature`: Obtiene la firma completa de un símbolo
- `get_references`: Encuentra dónde se usa un símbolo
- `list_exports`: Lista todas las exportaciones de un archivo
- `get_type_info`: Obtiene información de tipos detallada

#### Beneficios para proyectos grandes

| Métrica | Sin LazyLoadingAI | Con LazyLoadingAI |
|---------|-------------------|-------------------|
| Tokens por query | ~50k tokens | ~26k tokens |
| Tiempo de análisis | ~30s | ~18s |
| Precisión de contexto | 70% | 95% |
| Archivos escaneados | 100% | 15% (solo relevantes) |

#### Uso en Claude Code / OpenCode

1. Inicializa el índice en tu proyecto
2. El servidor MCP se conecta automáticamente
3. El agente usa las herramientas de búsqueda en lugar de leer archivos completos

#### Configuración recomendada

Añade a tu configuración MCP global:
```json
{
  "mcpServers": {
    "lazyloadingai": {
      "command": "lazyloadingai",
      "args": ["serve"]
    }
  }
}
```

## Development Workflow

### Before Starting
1. Check Node.js version compatibility
2. Install dependencies with `npm install`
3. Copy environment variables from `.env.example`
4. Run type checking with `npm run typecheck`
5. **[Opcional]** Inicializa LazyLoadingAI: `lazyloadingai init`

### During Development
1. Use TypeScript for type safety
2. Run linter frequently to catch issues early
3. Write tests for new features
4. Use meaningful commit messages
5. Review code changes before committing
6. **[Opcional]** LazyLoadingAI busca símbolos: `lazyloadingai search <patrón>`

### Before Committing
1. Run full test suite: `npm test`
2. Check linting: `npm run lint`
3. Verify formatting: `npm run format:check`
4. Run type checking: `npm run typecheck`
5. Test production build: `npm run build`