# SYLORA JavaScript / TypeScript SDK (foundation)

```bash
npm i # from app root; this SDK is source-shipped under sdk/js
```

```js
import { SyloraClient } from './sylora-client.mjs';

const client = new SyloraClient({ baseUrl: 'http://localhost:8787', token: process.env.SYLORA_TOKEN });
const status = await client.ecosystemStatus();
const identity = await client.identity();
```

Scopes and OAuth grants are managed via `/api/ecosystem/developer/*`. Never embed production secrets in frontend bundles.
