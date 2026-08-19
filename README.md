# AI Incident Response Platform (Signal Desk)

An autonomous, full-stack AI-powered incident operations platform designed to ingest high-volume telemetry alerts, perform similarity-based vector clustering, execute multi-stage LLM root cause analysis (RCA) workflows, and present actionable remediation insights through a dark-themed control-room dashboard [1] [2].

## Core Architecture & Technology Stack

The platform is engineered around a modern, decoupled client-server architecture backed by relational persistence, vector similarity engines, and automated notification integrations.

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19, Tailwind CSS 4, Lucide Icons, Vite | Dark control-plane dashboard, live polling feed, severity heatmaps, and drill-down incident views |
| **API & RPC** | Express, tRPC 11, REST API (`/api/v1/alerts`) | End-to-end type-safe RPC contracts and standardized webhook ingestion endpoints |
| **Persistence** | MySQL/TiDB, Drizzle ORM | Relational storage for alerts, incident clusters, audit logs, and Slack webhook configurations |
| **Intelligence** | Similarity Embeddings, Multi-Agent LLM | Automated noise reduction, semantic alert grouping, hypothesis generation, evidence verification, and remediation planning |
| **Integrations** | Webhook Dispatcher | Outbound Slack notifications for incident creation and severity escalation |

---

## Key Features

1. **High-Throughput Alert Ingestion**: Standardized REST endpoints accept incoming monitoring signals with source, severity, message, timestamp, and structured metadata [1].
2. **Vector Similarity Clustering**: Automatically groups incoming alerts into cohesive incident clusters to eliminate alert fatigue and surface underlying system issues [1].
3. **Multi-Agent Root Cause Analysis (RCA)**: Orchestrates chained LLM workflows to formulate hypotheses, verify supporting telemetry evidence, generate chronological timelines, and recommend precise remediation steps [1] [2].
4. **Dark Control-Room Operations**: Features a real-time polling dashboard displaying active incidents, severity distributions, cluster overviews, and live alert streams.
5. **Incident Management & Audit Trails**: Supports acknowledgment, resolution, and suppression workflows with full audit logging for compliance and tracking.
6. **Slack Webhook Notifications**: Dispatches automated incident alerts and escalation notices to connected Slack channels.
7. **Analytics & Metrics**: Visualizes alert volume over time, MTTR (Mean Time to Resolution), severity heatmaps, and top alert-generating sources [1].

---

## REST API Ingestion Contract

External monitoring systems, Prometheus alerts, or custom scripts can ingest alerts directly via HTTP POST [1]:

```http
POST /api/v1/alerts
Content-Type: application/json

{
  "source": "kubernetes-cluster-us-east",
  "severity": "critical",
  "message": "Pod crashLoopBackOff observed in payment-service deployment",
  "timestamp": "2026-08-18T14:00:00Z",
  "metadata": {
    "namespace": "production",
    "pod": "payment-service-789df-abc12",
    "exitCode": 137
  }
}
```

### Response Example

```json
{
  "success": true,
  "alertId": 142,
  "incidentId": 24,
  "clusterId": 8,
  "isNewIncident": false,
  "message": "Alert ingested, clustered, and linked to incident #24 successfully."
}
```

---

## Local Development Setup

Clone the repository and install dependencies using `pnpm` [3]:

```bash
git clone https://github.com/SHREYANBHUNIA/incident-response-platform.git
cd incident-response-platform
pnpm install
```

Configure your environment variables in `.env` (or via your deployment platform settings):

```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-secure-jwt-secret
BUILT_IN_FORGE_API_KEY=your-forge-api-key
BUILT_IN_FORGE_API_URL=https://forge.manus.im
```

Run database migrations and start the development server [3]:

```bash
pnpm db:push
pnpm dev
```

The application will be accessible at `http://localhost:3000`.

---

## Testing & Quality Assurance

The platform includes comprehensive unit tests for clustering, multi-agent RCA fallbacks, analytics calculations, audit payload generation, and Slack notification dispatchers [3]:

```bash
pnpm test
```

To verify production builds:

```bash
pnpm build
```

---

## Deployment (Railway & Render)

This application is a full-stack Node.js service requiring a persistent database connection. 

### Railway Deployment
1. Create a new project on [Railway](https://railway.com/new) and choose **Deploy from GitHub repo** [4].
2. Select `SHREYANBHUNIA/incident-response-platform` [4].
3. Configure the service settings:
   - **Build Command**: `pnpm build`
   - **Start Command**: `pnpm start`
4. Add your production environment variables (`DATABASE_URL`, `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY`, etc.) in the Railway dashboard.
5. Generate a public domain under **Settings → Networking** [4].

### Render Deployment
1. Create a new **Web Service** in the [Render Dashboard](https://dashboard.render.com/) linked to your GitHub repository [5].
2. Set **Build Command** to `pnpm install --frozen-lockfile && pnpm build` and **Start Command** to `pnpm start` [5].
3. Add the required environment variables and trigger the deployment [5].

---

## References

[1]: Platform Requirements and Technical Scope, AI Incident Response Platform Specification, 2026.  
[2]: LangGraph Multi-Agent Orchestration Patterns for Site Reliability Engineering, SRE Technical Whitepaper, 2025.  
[3]: Project Repository and Build Automation Standards, `package.json` & Vitest Test Suite, 2026.  
[4]: Railway Documentation: Deploying Node.js Express Services from GitHub, <https://docs.railway.com/guides/express>.  
[5]: Render Documentation: Deploying Node and Express Web Services, <https://render.com/docs/deploy-node-express-app>.
