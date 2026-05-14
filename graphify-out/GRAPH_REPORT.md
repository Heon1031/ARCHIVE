# Graph Report - C:\Users\헌주\Documents\Codex\2026-05-07\ai-md-docs-agents-ai-md  (2026-05-14)

## Corpus Check
- Corpus is ~31,073 words - fits in a single context window. You may not need a graph.

## Summary
- 338 nodes · 619 edges · 12 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11f30cd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_src_tabs_maintab_tsx|src_tabs_maintab_tsx]]
- [[_COMMUNITY_product_api_first_data_flow|product_api_first_data_flow]]
- [[_COMMUNITY_src_services_metaapi_ts|src_services_metaapi_ts]]
- [[_COMMUNITY_04_INSIGHT_RECORD_MODEL_insight_record|04_INSIGHT_RECORD_MODEL_insight_record]]
- [[_COMMUNITY_src_tabs_accountsettingstab_tsx|src_tabs_accountsettingstab_tsx]]
- [[_COMMUNITY_00_index_ai_agent_collaboration_index|00_index_ai_agent_collaboration_index]]
- [[_COMMUNITY_src_app_tsx|src_app_tsx]]
- [[_COMMUNITY_src_lib_taxonomy_ts|src_lib_taxonomy_ts]]
- [[_COMMUNITY_src_tabs_performancetab_tsx|src_tabs_performancetab_tsx]]
- [[_COMMUNITY_09_empty_error_state_rules_empty_error_state_rules|09_empty_error_state_rules_empty_error_state_rules]]

## God Nodes (most connected - your core abstractions)
1. `MainTab()` - 15 edges
2. `AI Agent Collaboration Rules Index` - 14 edges
3. `InsightRecord` - 13 edges
4. `Account` - 12 edges
5. `ContentItem` - 12 edges
6. `getManagedKeywords()` - 11 edges
7. `fetchMediaInsights()` - 11 edges
8. `API First Data Flow` - 11 edges
9. `PerformanceTab()` - 10 edges
10. `loadTaxonomySettings()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Content Dashboard HTML Entry` --conceptually_related_to--> `Content Operations Dashboard Product`  [INFERRED]
  index.html → docs/agents/02_PRODUCT_CONTEXT.md
- `accounts Table` --semantically_similar_to--> `Account`  [INFERRED] [semantically similar]
  docs/backend/01_DATABASE_SCHEMA.md → docs/data/02_ACCOUNT_MODEL.md
- `content_items Table` --semantically_similar_to--> `ContentItem`  [INFERRED] [semantically similar]
  docs/backend/01_DATABASE_SCHEMA.md → docs/data/03_CONTENT_ITEM_MODEL.md
- `insight_records Table` --semantically_similar_to--> `InsightRecord`  [INFERRED] [semantically similar]
  docs/backend/01_DATABASE_SCHEMA.md → docs/data/04_INSIGHT_RECORD_MODEL.md
- `taxonomy_settings Table` --semantically_similar_to--> `Keyword Taxonomy`  [INFERRED] [semantically similar]
  docs/backend/01_DATABASE_SCHEMA.md → docs/data/09_KEYWORD_TAXONOMY.md

## Communities (12 total, 0 thin omitted)

### Community 0 - "src_tabs_maintab_tsx"
Cohesion: 0.07
Nodes (34): normalizeContentType(), ContentFormState, DateRecommendation, dedupeCalendarRecommendations(), defaultTopics, emptyForm, formatLabels, formatMonthLabel() (+26 more)

### Community 1 - "product_api_first_data_flow"
Cohesion: 0.09
Nodes (41): Current Status, Product Documents Index, UI Documents Index, Product Direction, Test Checklist, Visual Direction, Known Issues, Layout Rules (+33 more)

### Community 2 - "src_services_metaapi_ts"
Cohesion: 0.09
Nodes (34): ApiConnectionResult, ApiErrorResult, ApiErrorStatus, ApiItemResult, ApiListResult, checkConnection(), createConnectionUrl(), createErrorResult() (+26 more)

### Community 3 - "04_INSIGHT_RECORD_MODEL_insight_record"
Cohesion: 0.13
Nodes (37): Backend Transition, Supabase Backend, Token Security, Data Model Index, Design Index, accounts Table, content_items Table, Database Schema (+29 more)

### Community 4 - "src_tabs_accountsettingstab_tsx"
Cohesion: 0.06
Nodes (16): inferManagedKeywordsFromText(), AccountFormState, AccountSettingsTabProps, connectionStatusLabels, contentFormatLabels, contentStatusLabels, createId(), emptyForm (+8 more)

### Community 5 - "00_index_ai_agent_collaboration_index"
Cohesion: 0.12
Nodes (36): AI Agent Collaboration Rules Index, API Document Index, API Connection Scope, API Failure Guidance, Official API Verification Before Implementation, Common Work Rules, All Account and Individual Account Filtering, Account Settings and API Test Flow (+28 more)

### Community 6 - "src_app_tsx"
Cohesion: 0.09
Nodes (27): AccountFilter(), AccountFilterProps, serializeFilter(), AppShell(), AppShellProps, TabNavigation(), TabNavigationProps, tabs (+19 more)

### Community 7 - "src_lib_taxonomy_ts"
Cohesion: 0.12
Nodes (25): canUseLocalStorage(), defaultContentTopics, defaultContentTypes, defaultManagedKeywords, defaultRecommendationTags, defaultStopWords, defaultTaxonomySettings, getActiveContentTopics() (+17 more)

### Community 8 - "src_tabs_performancetab_tsx"
Cohesion: 0.1
Nodes (15): formatAverage(), formatRate(), getAverage(), getBestGroupName(), getEngagementRate(), getGroupedPerformance(), getInsightRows(), getManagementSuggestions() (+7 more)

### Community 9 - "09_empty_error_state_rules_empty_error_state_rules"
Cohesion: 0.44
Nodes (9): Account Settings Guidance, Account Unregistered State, API Failure State, Common Principles, Copywriting Standards, Empty And Error State Rules, No Content State, No Performance Data State (+1 more)

## Knowledge Gaps
- **58 isolated node(s):** `initialFilter`, `AccountFilterProps`, `AppShellProps`, `TabNavigationProps`, `tabs` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Account` connect `src_app_tsx` to `src_tabs_maintab_tsx`, `src_tabs_performancetab_tsx`, `src_services_metaapi_ts`, `src_tabs_accountsettingstab_tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `InsightRecord` connect `src_app_tsx` to `src_tabs_maintab_tsx`, `src_tabs_performancetab_tsx`, `src_services_metaapi_ts`, `src_tabs_accountsettingstab_tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Platform` connect `src_app_tsx` to `src_tabs_maintab_tsx`, `src_tabs_performancetab_tsx`, `src_services_metaapi_ts`, `src_tabs_accountsettingstab_tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `initialFilter`, `AccountFilterProps`, `AppShellProps` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `src_tabs_maintab_tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `product_api_first_data_flow` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `src_services_metaapi_ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._