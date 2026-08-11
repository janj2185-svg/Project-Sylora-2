# SYLORA JavaScript / TypeScript SDK (foundation)

Thin client for the SYLORA Developer Platform. Uses API keys (`syl_…`) and scoped `/api/v1/*` routes.

```js
import { SyloraClient } from './sylora-client.js';

const client = new SyloraClient({
  baseUrl: 'http://localhost:8787',
  apiKey: process.env.SYLORA_API_KEY
});

const me = await client.identity.me();
```

Scopes required for current surface: `identity.read` (more scopes land as endpoints graduate from first-party to public v1).
