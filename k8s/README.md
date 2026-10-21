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

## Not done yet

- Only Zookeeper and Kafka are converted; the four application services are next.
- Images are not published anywhere, so the app Deployments will need either
  `kind load docker-image` or a registry.
- Credentials still need a `Secret`; the ConfigMap holds non-sensitive values only.
- Single broker, replication factor 1 — no high availability.
- No Terraform, no EKS, no metrics yet.
