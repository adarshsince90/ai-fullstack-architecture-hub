# Docker, Kubernetes & Container Orchestration

Containerization and Kubernetes orchestration are standard foundations for modern distributed computing. Senior and Lead Engineers must understand the kernel mechanics behind container isolation, Kubernetes control plane reconciliation loops, and production-grade zero-downtime deployment strategies.

---

## 1. Docker & Linux Container Internals

Containers are not lightweight Virtual Machines—they are isolated Linux processes governed by two kernel primitives:

```text
┌────────────────────────────────────────────────────────┐
│ LINUX KERNEL ISOLATION PRIMITIVES                      │
│                                                        │
│ 1. Namespaces (Visibility & Isolation):                │
│    • PID: Isolates process IDs (Process 1 inside container)
│    • NET: Dedicated virtual network interfaces & IP    │
│    • MNT: Isolated filesystem mount points             │
│    • IPC / UTS: Inter-process communication & hostname │
│                                                        │
│ 2. Control Groups (cgroups) (Resource Boundaries):     │
│    • Limits CPU shares and memory allocation           │
│    • Enforces hard memory caps to trigger OOMKilled     │
└────────────────────────────────────────────────────────┘
```

### Multi-Stage Build & Security Hardening:
```dockerfile
# ── Stage 1: Build & Publish (SDK Image)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MyApp.csproj", "./"]
RUN dotnet restore "MyApp.csproj"
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ── Stage 2: Hardened Runtime (Minimal & Non-Root)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app
# Run as unprivileged non-root user (Prevents container breakout exploits)
USER app
COPY --from=build --chown=app:app /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

---

## 2. Kubernetes Architecture & Control Plane Mechanics

```text
┌────────────────────────────────────────────────────────────────────────┐
│ KUBERNETES CONTROL PLANE                                               │
│                                                                        │
│  [ kube-apiserver ] ◄─── (Central REST gateway for all K8s operations) │
│       │        │                                                       │
│       ▼        ▼                                                       │
│   [ etcd ]  [ kube-scheduler ] ──► (Assigns unscheduled Pods to Nodes) │
│ (Raft DB)      │                                                       │
│                ▼                                                       │
│   [ kube-controller-manager ] ──► (Reconciliation Loops / Desired State)
└───────┬────────────────────────────────────────────────────────────────┘
        │ Enforces desired state across worker nodes
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WORKER NODE (Node 1)                                                   │
│                                                                        │
│  [ kubelet ] ──────► Communicates with container runtime (containerd) │
│  [ kube-proxy ] ───► Configures iptables / IPVS for Service routing    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ POD: [ Container (App) ] ── (Shares Network Namespace & Localhost)│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Production Deployments, Probes & Auto-Scaling

### 1. RollingUpdate Deployment Strategy
Prevents downtime by staggering pod replacements:
```yaml
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # Creates 1-2 new pods before terminating old ones
      maxUnavailable: 0    # Guarantees 100% capacity during deployments
```

### 2. The 3 Kubernetes Probes
- **Startup Probe**: Verifies if legacy/heavy initialization is complete. Disables liveness checks during startup.
- **Liveness Probe** (`/health/liveness`): Checks if the application process is healthy. If it fails, `kubelet` restarts the container.
- **Readiness Probe** (`/health/readiness`): Checks if the application can accept live network traffic (e.g. database connection is open). If it fails, the pod is removed from the Service Endpoints routing pool.

### 3. Resource Requests vs Limits (OOMKilled & CPU Throttling)
- **Requests**: Guaranteed baseline resources used by `kube-scheduler` for pod placement.
- **Limits**: Hard upper ceiling.
  - Exceeding **Memory Limit** $\to$ Immediate Linux OOM (Out-of-Memory) killer terminates the pod (`OOMKilled` Exit Code 137).
  - Exceeding **CPU Limit** $\to$ Linux CFS (Completely Fair Scheduler) **throttles** CPU cycles, degrading response latency without crashing.

---

## 4. Helm Charts & Enterprise Package Management

Helm is the Kubernetes package manager that templates and versions YAML manifests:

```text
my-chart/
├── Chart.yaml         # Package metadata, versioning, semver
├── values.yaml        # Default configuration parameters (replicas, image tags)
├── values-prod.yaml   # Production-specific overrides
└── templates/         # Parametric Kubernetes manifests
    ├── deployment.yaml
    ├── service.yaml
    ├── hpa.yaml
    └── ingress.yaml
```

---

## 5. Senior & Lead Interview Scenarios

### Q1: Why should you avoid setting CPU limits in certain high-throughput microservices?
**Lead Answer**: While setting Memory Limits is mandatory to prevent runaway memory leaks from destabilizing the physical node, strict CPU Limits can cause severe latency degradation. When a pod exceeds its CPU quota within a 100ms CFS time slice, Linux CFS violently throttles the process until the next window, introducing artificial latency spikes (p99 latency jumps from 15ms to 800ms). Many high-performance organizations rely on **CPU Requests** with Horizontal Pod Autoscalers (HPA) rather than hard CPU limits.

### Q2: What happens when a Kubernetes Pod transitions from Terminating to Deleted?
**Lead Answer**: 
1. `kube-apiserver` sets the Pod state to `Terminating` and starts the `terminationGracePeriodSeconds` (default 30s) timer.
2. The Pod is removed immediately from the Service's `Endpoints` list so no new incoming traffic is routed to it.
3. The `preStop` hook executes (allowing in-flight requests to complete).
4. `SIGTERM` signal is sent to the container process.
5. If the process does not terminate within the grace period, `SIGKILL` is issued to force termination.
