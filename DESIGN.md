# AI Incident Response Platform — System Architecture & Design Specification

## Overview
The **AI Incident Response Platform** is an enterprise-grade observability and automated remediation control plane. Designed to solve alert fatigue, it ingests high-volume telemetry from heterogeneous sources, groups correlated alerts using vector similarity clustering, executes a multi-stage LLM root cause analysis (RCA) workflow, generates chronological incident timelines, and orchestrates remediation and webhook integrations (Slack).

## System Architecture

```
[ Monitoring Tools / Kafka / Prometheus / Apps ]
                   │
                   ▼ (POST /api/v1/alerts)
        ┌─────────────────────┐
        │  Express REST API   │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ PostgreSQL Database │◄─── Drizzle ORM
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  Clustering Engine  │◄─── Vector Similarity / Jaccard
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Multi-Agent RCA Wf  │◄─── LLM Service (Hypothesis, Evidence, Remediation)
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Slack Webhook & UI  │◄─── React 19 Dashboard (Dark Theme)
        └─────────────────────┘
```

## Data Models
1. **alerts**: Stores incoming telemetry (`id`, `source`, `severity`, `message`, `metadata`, `status`, `createdAt`, `fingerprint`).
2. **clusters**: Groups correlated alerts (`id`, `title`, `summary`, `status`, `severity`, `createdAt`).
3. **clusterAlerts**: Many-to-many relationship mapping alerts to incident clusters.
4. **incidents**: Rich RCA records (`id`, `clusterId`, `rootCause`, `explanation`, `suggestedFixes`, `timeline`, `status`, `severity`).
5. **auditLogs**: Immutable audit trail for management actions (`id`, `entityType`, `entityId`, `action`, `actor`, `details`, `createdAt`).
6. **configurations**: Key-value store for integration settings like Slack webhook URLs.

## API Contracts
- `POST /api/v1/alerts`: Ingests single or batch alerts. Validates source, severity (`info`, `warning`, `error`, `critical`), message, and metadata.
- `GET /api/v1/health`: Health check endpoint.
- tRPC Routers (`/api/trpc/*`):
  - `alerts.*`: List, acknowledge, resolve, suppress alerts with audit logging.
  - `incidents.*`: List clusters/incidents, trigger RCA, view timelines and fixes.
  - `metrics.*`: Aggregate alert volume, MTTR, severity distributions, top sources.
  - `config.*`: Get and update Slack webhook configurations.
