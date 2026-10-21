# Kubernetes

Work in progress: converting the Docker Compose topology in the repo root to
Kubernetes manifests. Runs on a local `kind` cluster today; the target is EKS
provisioned with Terraform.

```bash
kind create cluster --name news
kubectl apply -f k8s/
kubectl get pods -n news -w
```

## How Compose maps onto Kubernetes

| Compose | Kubernetes | Note |
|---|---|---|
| `service:` | `Deployment` + `Service` | Compose conflates "what runs" with "how it is reached". Kubernetes separates them. |
| `depends_on: condition: service_healthy` | *nothing* | See below. |
| `networks:` | implicit | Every pod can reach every other pod; `kafka:9092` resolves through cluster DNS. |
| `environment:` | `ConfigMap` | The broker address was repeated on four services in Compose; now it lives in one place. |
| `ports: "8001:8001"` | `Service` + `kubectl port-forward` | Nothing is published to the host automatically. |
| `restart: unless-stopped` | default behaviour | A Deployment always restarts its pods. |
| `build:` | *nothing* | Kubernetes only pulls images; they have to be built and loaded separately. |

## The two decisions worth explaining

**Startup ordering disappears.** Compose could say "do not start unit2 until
Kafka is healthy". Kubernetes has no equivalent, by design: it assumes processes
crash and restart constantly, so instead of sequencing startup it lets a pod
fail, restarts it, and repeats until it succeeds. The health checks carry over
as `readinessProbe`, but their job changed — they no longer gate anything, they
only decide whether a pod receives traffic. Convergence replaced ordering.

**Kafka is a StatefulSet, not a Deployment.** A Deployment assigns pods random
names (`kafka-7d9f8-x2k4p`). Kafka does not merely accept connections — it
*advertises* an address back to clients, which then dial that address directly.
An identity that changes on every restart breaks them. A StatefulSet gives
stable ordinal names (`kafka-0` stays `kafka-0`), and the headless Service
(`clusterIP: None`) gives each pod its own DNS record. `advertised.listeners`
then points at the stable Service name rather than at a pod.

This is the same problem the Compose file solved with two advertised listeners,
one for the Docker network and one for the host — the fix just takes a different
shape here.

## Two things that broke, and why

Both were collisions between a Kubernetes default and an assumption baked into the
Confluent image. Neither component was wrong on its own.

**`enableServiceLinks: false`** — Kubernetes injects legacy Docker-links environment
variables into every pod, one set per Service in the namespace. A Service here is called
`kafka`, so every pod received `KAFKA_PORT=tcp://<clusterIP>:9092`. The Confluent image
turns every `KAFKA_*` variable into a `server.properties` line, so that arrived as
`port=tcp://10.96.x.x:9092` — a deprecated setting handed a URL where it wanted a number.
The broker exited immediately with *"port is deprecated. Please use
KAFKA_ADVERTISED_LISTENERS instead."* The service name collided with the image's own
configuration prefix.

**`publishNotReadyAddresses: true`** on the headless Service — a broker has to resolve its
own advertised name while it is still starting, which is by definition before it is Ready.
By default a Service publishes DNS records only for Ready pods, so the record did not exist
yet, so the broker could not finish starting, so it never became Ready. This flag breaks
that circle.

## Not done yet

- Only Zookeeper and Kafka are converted; the four application services are next.
- Images are not published anywhere, so the app Deployments will need either
  `kind load docker-image` or a registry.
- Credentials still need a `Secret`; the ConfigMap holds non-sensitive values only.
- Single broker, replication factor 1 — no high availability.
- No Terraform, no EKS, no metrics yet.
