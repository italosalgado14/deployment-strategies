# Deployment Strategies Guide

A comprehensive reference for deployment strategies, with special focus on **MLOps** contexts.

# Page Site

https://github.com/italosalgado14/deployment-strategies/settings/pages

---

## Table of Contents

1. [Quick Comparison](#quick-comparison)
2. [Recreate](#1-recreate-deployment)
3. [Rolling Update](#2-rolling-update)
4. [Blue-Green](#3-blue-green)
5. [Canary](#4-canary)
6. [A/B Testing](#5-ab-testing)
7. [Shadow Deployment](#6-shadow-deployment-mirroring)
8. [Feature Flags / Dark Launch](#7-feature-flags--dark-launch)
9. [Multi-Armed Bandit](#8-multi-armed-bandit-mab)
10. [Interleaving](#9-interleaving)
11. [Champion / Challenger](#10-champion--challenger)
12. [Decision Guide](#decision-guide)

---

## Quick Comparison

| Strategy | Downtime | Rollback Speed | Infra Cost | Risk | Best For |
|---|---|---|---|---|---|
| Recreate | Yes | Slow | Low | High | Dev / incompatible schemas |
| Rolling Update | No | Medium | Low | Medium | Stateless services |
| Blue-Green | No | Instant | High (2x) | Low | Critical prod releases |
| Canary | No | Fast | Medium | Low | Gradual risk-controlled release |
| A/B Testing | No | N/A | Medium | Low | Product experimentation |
| Shadow | No | N/A | High | Very Low | ML model validation |
| Feature Flags | No | Instant | Low | Very Low | Decoupling deploy & release |
| MAB | No | Auto | Medium | Low | Multi-variant optimization |
| Interleaving | No | N/A | Medium | Low | Ranking/recommendation systems |
| Champion/Challenger | No | Fast | Medium-High | Low | Continuous ML model evaluation |

---

## 1. Recreate Deployment

**Shut down v1 completely, then start v2.** Simple but causes downtime.

```
Time ──────────────────────────────────►

 [v1 v1 v1]  ─► [  DOWN  ] ─► [v2 v2 v2]
   Active       Downtime       Active
```

### When to use
- Incompatible database migrations
- Dev or staging environments
- Batch jobs where users are not actively connected

### Trade-offs
| Pros | Cons |
|---|---|
| Simple to implement | Downtime required |
| No version coexistence issues | Slow rollback (full redeploy) |
| Low infra cost | Bad UX for live users |

---

## 2. Rolling Update

Replace instances **gradually**, batch by batch. Default strategy in Kubernetes.

```
Step 0:  [v1][v1][v1][v1]
Step 1:  [v2][v1][v1][v1]
Step 2:  [v2][v2][v1][v1]
Step 3:  [v2][v2][v2][v1]
Step 4:  [v2][v2][v2][v2]
```

### Key parameters
- `maxSurge`: how many extra instances can exist during rollout
- `maxUnavailable`: how many can be down simultaneously

### Trade-offs
| Pros | Cons |
|---|---|
| No downtime | Both versions coexist during rollout |
| No extra infra | Rollback is slow (another rolling update) |
| Built into K8s, ECS, etc. | Hard to test v2 in isolation |

---

## 3. Blue-Green

Two **identical environments**. Switch traffic 100% at once.

```
        ┌─────────────┐
        │ Load Balancer│
        └──────┬──────┘
               │ (100% traffic)
         ┌─────┴─────┐
         ▼           ▼
   ┌─────────┐  ┌─────────┐
   │  BLUE   │  │  GREEN  │
   │  v1 ✅  │  │  v2 💤  │
   │ (live)  │  │ (idle)  │
   └─────────┘  └─────────┘

   After switch:
         ┌─────┴─────┐
         ▼           ▼
   ┌─────────┐  ┌─────────┐
   │  BLUE   │  │  GREEN  │
   │  v1 💤  │  │  v2 ✅  │
   │ (idle)  │  │ (live)  │
   └─────────┘  └─────────┘
```

### Trade-offs
| Pros | Cons |
|---|---|
| Instant rollback | Doubles infra cost |
| Zero downtime | Stateful services need care (DB, sessions) |
| Easy to test green before switch | Big-bang switch (no gradual validation) |

---

## 4. Canary

Route a **small percentage** of real traffic to the new version, monitor, then progressively scale up.

```
Phase 1 (5%):
   ┌─────────────┐
   │   Router    │
   └──┬───────┬──┘
      │ 95%   │ 5%
      ▼       ▼
    [v1]    [v2] ◄── monitor metrics

Phase 2 (25%):  75% → v1  |  25% → v2
Phase 3 (50%):  50% → v1  |  50% → v2
Phase 4 (100%):  0% → v1  | 100% → v2
```

### Metrics to monitor
- Error rate (4xx, 5xx)
- Latency (p50, p95, p99)
- Resource usage (CPU, memory, GPU)
- In ML: prediction distribution, confidence drift

### Tools
Flagger, Argo Rollouts, Istio, Linkerd, Seldon Core, KServe.

---

## 5. A/B Testing

Split traffic between variants to **compare business metrics**. Not a deployment mechanism — an experimentation framework.

```
                  ┌────────────┐
                  │   Users    │
                  └─────┬──────┘
                        │
            ┌───────────┴───────────┐
            │ 50%                   │ 50%
            ▼                       ▼
       ┌─────────┐             ┌─────────┐
       │ Variant │             │ Variant │
       │    A    │             │    B    │
       └────┬────┘             └────┬────┘
            │                       │
            └───────┬───────────────┘
                    ▼
           Measure: CTR, conversion,
           revenue, engagement
```

### Canary vs A/B

| Aspect | Canary | A/B Testing |
|---|---|---|
| **Goal** | Detect defects | Measure business impact |
| **Domain** | DevOps | Product / Data Science |
| **Duration** | Minutes–hours | Days–weeks |
| **Versions** | Functionally equal | Intentionally different |
| **User assignment** | Random, non-sticky | Sticky per user |
| **Success criteria** | "No regression" | Statistical significance |
| **Rollback** | Automatic on degradation | Pick winner, retire loser |

---

## 6. Shadow Deployment (Mirroring)

New version receives **mirrored real traffic**, processes it fully, but its output is **discarded** (or only logged). Clients never see v2's output.

```
              ┌────────────┐
              │   Client   │
              └──────┬─────┘
                     │ request
                     ▼
              ┌────────────┐
              │   Router   │
              └──┬──────┬──┘
                 │      │ (mirror)
         response│      │
                 ▼      ▼
            ┌──────┐ ┌──────┐
            │  v1  │ │  v2  │
            │ ✅   │ │ 🔇   │ ◄── output logged,
            └──────┘ └──────┘     not returned
                 │
                 ▼
             Client sees
             only v1 output
```

### Why it's the gold standard in MLOps
- Zero blast radius: clients never affected
- Validates with real production data (not offline test sets)
- Detects data skew, feature corruption, latency issues
- Enables offline comparison: v1 predictions vs v2 predictions

### Typical MLOps flow
```
Shadow (validate) ──► Canary (limited real traffic) ──► Cutover (full promotion)
```

---

## 7. Feature Flags / Dark Launch

Deploy code to 100% of instances, but keep functionality **behind a flag**. Activate per user, region, cohort, or percentage.

```
┌─────────────────────────────────┐
│  Deployed code (all instances)  │
│  ┌───────────────────────────┐  │
│  │ if (flag.isEnabled(user)) │  │
│  │     return new_model()    │  │  ◄── controlled
│  │ else                      │  │     remotely
│  │     return old_model()    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Use cases
- Kill-switch for bad features (instant disable, no redeploy)
- Gradual rollout by user segment
- Internal dogfooding before public release
- Geographic rollouts (e.g., EU first, then Americas)

### Tools
LaunchDarkly, Unleash, Flagsmith, Split.io.

---

## 8. Multi-Armed Bandit (MAB)

Dynamic A/B testing: the system **auto-adjusts traffic** toward the winning variant using algorithms like epsilon-greedy, Thompson sampling, or UCB.

```
Initial:     A: 50%  ████████████  B: 50%  ████████████
Day 3:       A: 35%  ████████      B: 65%  ████████████████
Day 7:       A: 15%  ███           B: 85%  █████████████████████
Day 14:      A:  5%  █             B: 95%  ████████████████████████
```

### MAB vs A/B

| Aspect | A/B | MAB |
|---|---|---|
| Traffic split | Fixed (e.g., 50/50) | Dynamic, adaptive |
| Goal | Statistical significance | Minimize regret |
| Best for | Clear hypothesis testing | Optimization with many variants |
| Analysis complexity | Standard stats | More complex |

---

## 9. Interleaving

Specific to **ranking / recommendation systems**. Instead of showing model A to some users and model B to others, mix both models' results in the **same response** and measure which items users interact with.

```
Model A ranks:  [a1, a2, a3, a4, a5]
Model B ranks:  [b1, b2, b3, b4, b5]

Interleaved:    [a1, b1, a2, b2, a3, b3, ...]
                  ▲   ▲
                  │   │
                Track which items get clicks
```

### Advantages
- 10–100x more statistically efficient than A/B
- Same user sees both models → eliminates inter-user variance
- Faster convergence to significance

### Limitations
- Only applies to ranked lists (search, recommendations, feeds)
- Requires careful de-biasing of position effects

---

## 10. Champion / Challenger

Standard MLOps pattern: the **champion** serves production traffic; one or more **challengers** run in shadow or canary mode. When a challenger consistently beats the champion on defined metrics, it gets promoted.

```
        ┌──────────────────────┐
        │   Production traffic │
        └──────────┬───────────┘
                   │
                   ▼
           ┌──────────────┐
           │  Champion 🏆 │ ──► serves clients
           │    (v1)      │
           └──────────────┘
                   │
                   │ (shadow copy)
                   ▼
           ┌──────────────┐
           │ Challenger 1 │ ──► metrics logged
           │    (v2)      │
           └──────────────┘
           ┌──────────────┐
           │ Challenger 2 │ ──► metrics logged
           │    (v3)      │
           └──────────────┘

   Auto-promotion rule:
   if challenger.AUC > champion.AUC + 0.02
      for 7 consecutive days with p < 0.05
      → promote to champion
```

### Tools
MLflow Model Registry, Vertex AI, SageMaker, Databricks Model Serving.

---

## Decision Guide

### By primary goal

| If your goal is... | Use |
|---|---|
| Zero-risk validation with real data | **Shadow** |
| Detect technical regressions safely | **Canary** |
| Measure business KPI improvement | **A/B testing** |
| Instant rollback on critical service | **Blue-Green** |
| Decouple deploy from release | **Feature Flags** |
| Continuous ML model improvement | **Champion/Challenger** |
| Optimize among many variants | **MAB** |
| Evaluate ranking models efficiently | **Interleaving** |

### Recommended MLOps stack

```
   ┌─────────────────────────────────────────────────────┐
   │                                                     │
   │   1. Shadow          ──► validate technically       │
   │      (real data, no client impact)                  │
   │                                                     │
   │   2. Canary 5–25%    ──► validate with real users   │
   │      (limited blast radius)                         │
   │                                                     │
   │   3. A/B 50/50       ──► measure business impact    │
   │      (statistical significance)                     │
   │                                                     │
   │   4. Full cutover    ──► blue-green switch          │
   │      (100% promotion)                               │
   │                                                     │
   │   ─── Feature flags wrap all stages as kill-switch ─│
   │                                                     │
   └─────────────────────────────────────────────────────┘
```

### Key principle
**Strategies are composable, not mutually exclusive.** A mature MLOps pipeline typically combines shadow + canary + feature flags + champion/challenger evaluation, with blue-green as the final promotion mechanism.

---

## Glossary

- **Blast radius**: scope of users/systems affected if a deployment fails
- **Cutover**: the moment traffic is fully switched from old to new version
- **Regret** (MAB): loss from serving a suboptimal variant during exploration
- **Skew** (ML): mismatch between training data and production data distributions
- **SLO**: Service Level Objective — quantitative reliability target
- **Sticky session**: ensuring a user consistently sees the same variant

