# Distributed News Processing Platform

A four-service, event-driven pipeline that ingests news articles, extracts named entities with a
BERT model, enriches and stores them, and streams the result to a browser in real time.

Built as a Cloud Computing course project. The point of it was not the news — it was getting four
independent services to cooperate over a message bus without calling each other directly.

```
┌────────────────────────────────────────────────┐
│  Unit 4 · Frontend                             │
│  React + Vite + Tailwind, live over WebSocket  │
│  :3000                                         │
└───────────────────────┬────────────────────────┘
                        │ HTTP / WS
┌───────────────────────┴────────────────────────┐
│  Unit 1 · API Gateway                          │
│  FastAPI · produces raw-news                   │
│           consumes processed-news → WebSocket  │
│  :8001                                         │
└───────────────────────┬────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │   Apache Kafka :9092  │
            │   + Zookeeper :2181   │
            └───────────┬───────────┘
          raw-news      │      ner-processed
            ┌───────────┴───────────┐
            ↓                       ↓
┌───────────────────────┐ ┌───────────────────────┐
│  Unit 2 · NER         │ │  Unit 3 · Storage     │
│  dslim/bert-base-NER  │ │  Firestore + images   │
│  :8002                │ │  :8003                │
└───────────────────────┘ └───────────────────────┘
```

## Flow

1. The gateway fetches articles and publishes them to `raw-news`.
2. The NER service consumes `raw-news`, runs `dslim/bert-base-NER` over title and description,
   and republishes the article with an entity array to `ner-processed`.
3. The storage service consumes `ner-processed`, resolves an image per entity from Wikimedia
   Commons, persists the article to Firestore, and emits `processed-news`.
4. The gateway consumes `processed-news` and pushes it to every connected browser.

Each service runs in its **own consumer group** with its own `auto_offset_reset` policy, so the
three stages advance and replay independently of one another.

## Running it

```bash
cp .env.example .env     # fill in NEWSDATA_API_KEY and Firebase credentials
docker compose up --build
```

Frontend on `:3000`, gateway on `:8001`.

Two details worth pointing out in the Compose file, because both are easy to get wrong:

- **Start-up is gated on health checks, not sleep timers.** Services declare
  `depends_on: { kafka: { condition: service_healthy } }`, and Kafka's health check is an actual
  `kafka-topics --list` call rather than a port probe.
- **The broker advertises two listeners** — `PLAINTEXT://kafka:9092` for traffic inside the Docker
  network and `PLAINTEXT_HOST://localhost:9093` for the host — so the same cluster is reachable
  from a container and from the developer machine without reconfiguration.

## Stack

| Layer | Choice |
|---|---|
| Services | Python 3.11, FastAPI, Uvicorn |
| Messaging | Apache Kafka 7.5 (Confluent), `kafka-python` |
| NER | Hugging Face Transformers, `dslim/bert-base-NER` |
| Storage | Firebase Firestore |
| Frontend | React 18, Vite, Tailwind, React Router |
| Orchestration | Docker Compose |

## What this project is not

Being explicit, since it is a course project and not a production system:

- No Kubernetes or Terraform — orchestration is Docker Compose, for local use.
- Single Kafka broker, replication factor 1. No replication or partitioning strategy.
- No automated tests. The `make test` target runs health checks, not assertions.
- No authentication, TLS, or rate limiting on the API.
- No metrics or centralised logging — services log to stdout.
- Consumers log errors but do not retry; there is no dead-letter topic.

The natural next step is converting the Compose topology to Kubernetes manifests and provisioning
a cluster with Terraform.
