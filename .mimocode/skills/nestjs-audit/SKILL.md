---
name: nestjs-audit
description: Analyze a NestJS project for security, performance, and best practice issues, then implement fixes. Use when the user asks to "analyze", "audit", "review", or "improve" a NestJS project.
---

# NestJS Project Audit & Improvement

Systematically analyze a NestJS project for common issues, produce a prioritized improvement checklist, and implement fixes one by one.

## Inputs

- **Project directory** — path to the NestJS project root (contains `package.json`, `src/`, `tsconfig.json`)
- **Scope** (optional) — `security`, `performance`, `best-practices`, or `all` (default: `all`)

## Phase 1 — Read Project Structure

Read these files to understand the project:

1. `package.json` — dependencies, scripts, Node/NestJS version
2. `tsconfig.json` — strictness settings (`noImplicitAny`, `strict`, etc.)
3. `src/main.ts` — entry point: middleware, CORS, helmet, static serving
4. `src/app.module.ts` — root module: imports, throttler config, cache, schedule

Then read the directory listing of `src/` to identify all feature modules.

## Phase 2 — Read Security-Relevant Files

Read all files in these directories:

- `src/auth/` — authentication, JWT strategy, token handling, password hashing
- `src/common/guards/` — authorization guards
- `src/common/middleware/` — logging, CORS, body parsing
- `src/common/interceptors/` — cache interceptors, transform interceptors
- `src/common/pipes/` — input validation and sanitization
- `src/common/services/shared-store/` — Redis/cache access patterns
- `src/common/services/expression-evaluator/` — if present, check for eval/AST patterns

## Phase 3 — Read Service Files

Read all service files in each feature module:

- `src/<module>/*.service.ts` — business logic, DB queries, Redis operations
- `src/<module>/*.controller.ts` — route handlers, decorators, throttling
- `src/<module>/*.module.ts` — dependency injection, imports

## Phase 4 — Check for Common Issues

Scan for these patterns (check each one):

### Security
- [ ] **Missing helmet** — no `helmet()` middleware in `main.ts`
- [ ] **Wildcard CORS** — `origin: '*'` instead of explicit origins
- [ ] **Wildcard CORS methods** — `methods: '*'` instead of explicit list
- [ ] **Missing rate limiting** — no `ThrottlerModule` or per-route `@Throttle()`
- [ ] **eval() usage** — `eval()`, `new Function()`, or `setTimeout(string)` in service files
- [ ] **Timing attacks** — password comparison with `!==` instead of `crypto.timingSafeEqual`
- [ ] **SQL injection** — raw SQL via `literal()` or `query()` without parameterization
- [ ] **Missing security headers** — no HSTS, X-Frame-Options, X-Content-Type-Options

### Performance
- [ ] **N+1 queries** — loops with individual DB/Redis calls instead of batch operations
- [ ] **Missing cache** — repeated expensive queries without caching
- [ ] **Separate Redis connections** — multiple ioredis clients that could be consolidated
- [ ] **Missing indexes** — queries on non-indexed columns (check slow query logs)

### Best Practices
- [ ] **logger.error string interpolation** — `logger.error(\`${msg} ${error}\`)` loses stack traces; should be `logger.error(msg, error)`
- [ ] **Missing error handling** — Redis/DB operations without try/catch
- [ ] **Weak TypeScript strictness** — `noImplicitAny: false`, `strict: false` in tsconfig
- [ ] **dist/ committed to git** — build artifacts in version control
- [ ] **Health check auth-gated** — health endpoint requires JWT (useless for k8s probes)
- [ ] **Static assets only in non-production** — conditional static serving

## Phase 5 — Produce Improvement Checklist

Create a prioritized checklist with items grouped by category (Security > Performance > Best Practices). For each item:

- One-line description of the issue
- File path and line number
- Severity: **Critical** / **High** / **Medium** / **Low**
- Estimated effort: **Quick** (< 5 min) / **Medium** (5-30 min) / **Large** (> 30 min)

Present the checklist to the user and ask which items to implement.

## Phase 6 — Implement Fixes

For each approved fix:

1. Read the target file(s)
2. Make the change
3. Run `npm run lint 2>&1 && npm test 2>&1` to verify
4. If tests fail, fix the issue before moving to the next item
5. Update the checklist with completion status

### Common Fix Patterns

**Helmet with /static exception:**
```ts
import helmet from 'helmet';
app.use(helmet());
app.use('/static', helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
```

**CORS restricted:**
```ts
app.enableCors({
  origin: ['http://eta24.ru:3000', 'http://localhost:3000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
});
```

**Throttler with per-route override:**
```ts
@Throttle({ default: { limit: 10, ttl: seconds(60) } })
// Per-route override:
@Throttle({ default: { limit: 5, ttl: seconds(60) } })
```

**logger.error fix:**
```ts
// Before (loses stack trace):
logger.error(`Failed: ${error}`);
// After (preserves stack trace):
logger.error('Failed', error);
```

**Timing-safe password comparison:**
```ts
import * as crypto from 'crypto';
const a = Buffer.from(input);
const b = Buffer.from(stored);
if (a.length !== b.length) return false;
return crypto.timingSafeEqual(a, b);
```

**Redis error handling:**
```ts
try {
  const result = await this.redis.get(key);
  return result ? JSON.parse(result) : null;
} catch (error) {
  this.logger.error('Redis operation failed', error);
  return null;
}
```

## Phase 7 — Verification

After all fixes are applied:

1. `npm run lint` — no errors
2. `npm run build` — compiles cleanly
3. `npm test` — all tests pass
4. `npm run test:e2e` — e2e tests pass (if applicable)

## Output

- Improvement checklist with before/after status for each item
- Summary of all changes made
- Any remaining items that require manual review or architectural changes
