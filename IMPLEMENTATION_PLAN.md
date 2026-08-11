# IMPLEMENTATION_PLAN

## Principle

Powerful underneath, simple on the surface. Extend the working core; do not clone TikTok/Twitch/Discord/ChatGPT as disconnected tabs.

## Completed this iteration

0. Audit docs created  
1. Digital Human assembly fix  
2. Stage 1 foundation: Identity, permissions, memory export/purge, KG, action levels, activity audit  
3. Stage 2 foundation: agent catalog/install, developer sandbox apps/keys/scopes  
4. Stage 3 foundation: translation prefs + sandbox text translation API  
5. Stage 4/5 touchpoints: Business OS org + AI control plane kill switch/budgets; Creator Studio remains the LIVE creation surface  
6. Stage 6 seed: provenance records on AI-confirmed posts; reputation model stub  
7. Stage 7 seed: ecosystem status endpoint, cost budget fields on org policy, AI search structured layer

## Next implementation order

1. Postgres repository dual-write for ecosystem tables (010)  
2. Expand AI tools against permission registry + Action Engine  
3. Wire translation into messages/LIVE when provider configured  
4. AI Creator Studio package composer inside existing Studio  
5. OAuth/OIDC + hashed API keys + rate-limited public API gateway  
6. Vector search + observability exporters  
7. Real payments only with PSP + compliance — never fake balances as production

## Definition of Done reminder

UI alone ≠ done. Backend, persistence, authz, empty/loading/error states, mobile/desktop, tests, and no critical TODO required.
