"""Seed data derived from Autonomous_AI_Workforce_7_Day_API_Architecture_3_Developers.pdf.

All work_items are seeded as Pending (day-by-day deliverables from the spec) so the
dashboard is immediately usable without fabricating progress that hasn't happened.
"""
import datetime
from sqlalchemy.orm import Session
from . import models

TODAY = datetime.date.today()

DEVELOPERS = [
    {
        "code": "developer_1",
        "name": "Bharath",
        "responsibility": "Core Intelligence & Control",
        "focus_areas": "Perception,Master Orchestrator,Planner,Capability Manager,Guardrail/Security,"
                        "Execution Manager,Verification,Reflection/Re-plan,Retry control",
    },
    {
        "code": "developer_2",
        "name": "Dhanuja",
        "responsibility": "Local AI, Tools & Software Development",
        "focus_areas": "Local model runtime,Model Service,Reasoning/coding/ASR integration,Tool adapters,"
                        "Docker,Filesystem,Terminal,Git,Browser,Software Development,Software Verification",
    },
    {
        "code": "developer_3",
        "name": "Anshif",
        "responsibility": "Memory, Twins, Specialists & Product",
        "focus_areas": "Obsidian Memory,Controlled research,Memory validation,Executive Twins,"
                        "Specialist registry/lifecycle,Frontend/product integration,Walkthrough,Activity",
    },
]

# Day -> deliverable text, per developer code
DELIVERABLES = {
    "developer_1": {
        1: "Backend skeleton, schemas, API conventions, logging",
        2: "Perception + Master Orchestrator + task state",
        3: "Planner + Capability Manager + Guardrail",
        4: "Workforce routing contracts",
        5: "Execution Manager + queues + timeouts + events",
        6: "Verification + evidence + Reflection + Re-plan Gate",
        7: "Full control-loop integration + stability",
    },
    "developer_2": {
        1: "GPU/model runtime",
        2: "Model service",
        3: "Tools",
        4: "Software Development",
        5: "Real code execution",
        6: "Tests/security evidence",
        7: "Stabilization",
    },
    "developer_3": {
        1: "Frontend/contracts",
        2: "Task/status integration",
        3: "Obsidian Memory",
        4: "Twins + Specialist registry",
        5: "Workforce/memory integration",
        6: "Walkthrough/activity",
        7: "Final integration",
    },
}

MODULE_BY_DAY = {
    "developer_1": {
        1: "Master Orchestrator", 2: "Perception", 3: "Planner", 4: "Capability Manager",
        5: "Execution Manager", 6: "Verification", 7: "Reflection/Re-plan",
    },
    "developer_2": {
        1: "Local model runtime", 2: "Model Service", 3: "Tool adapters", 4: "Software Development",
        5: "Docker", 6: "Software Verification", 7: "Terminal",
    },
    "developer_3": {
        1: "Frontend/product integration", 2: "Specialist registry/lifecycle", 3: "Obsidian Memory",
        4: "Executive Twins", 5: "Memory validation", 6: "Walkthrough", 7: "Controlled research",
    },
}

# endpoint, method, owner_code, purpose, category
API_CATALOG = [
    # Bharath - Dev1
    ("/api/v1/perception", "POST", "developer_1", "Normalize voice/text/file input; intent, goals, constraints", "Perception"),
    ("/api/v1/tasks", "POST", "developer_1", "Task creation", "Task/Orchestrator"),
    ("/api/v1/tasks/{id}", "GET", "developer_1", "Task lifecycle/state", "Task/Orchestrator"),
    ("/api/v1/tasks/{id}/cancel", "POST", "developer_1", "Task cancellation", "Task/Orchestrator"),
    ("/api/v1/tasks/{id}/plan", "POST", "developer_1", "Steps, dependencies, criteria, stopping conditions", "Planner"),
    ("/api/v1/capabilities/resolve", "POST", "developer_1", "Capability -> worker/tool/model mapping", "Capability Manager"),
    ("/api/v1/security/check", "POST", "developer_1", "Allow/block/escalate + audit", "Guardrail"),
    ("/api/v1/verifications", "POST", "developer_1", "Objective tests, evidence, quality/security", "Verification"),
    ("/api/v1/reflections", "POST", "developer_1", "Failure analysis", "Reflection/Re-plan"),
    ("/api/v1/replans", "POST", "developer_1", "Validated recovery", "Reflection/Re-plan"),
    ("/api/v1/tasks/{id}/retry", "POST", "developer_1", "Bounded retry execution", "Reflection/Re-plan"),
    ("/api/v1/projects", "POST", "developer_1", "Initialize advanced project + versioned plan", "Task/Orchestrator"),

    # Dhanuja - Dev2
    ("/api/v1/models/infer", "POST", "developer_2", "Local reasoning/coding inference", "Model Service"),
    ("/api/v1/models/transcribe", "POST", "developer_2", "Audio -> transcript segments", "Model Service"),
    ("/api/v1/models", "GET", "developer_2", "Model inventory/status", "Model Service"),
    ("/api/v1/tools/execute", "POST", "developer_2", "Approved tool action", "Tool Executor"),
    ("/api/v1/tools", "GET", "developer_2", "Tool registry", "Tool Executor"),
    ("/api/v1/executions", "POST", "developer_2", "Start isolated workspace execution", "Execution"),
    ("/api/v1/executions/{id}", "GET", "developer_2", "Execution status/result", "Execution"),
    ("/api/v1/executions/{id}/files", "POST", "developer_2", "Read/write project files (diff/hash)", "Software Development"),
    ("/api/v1/executions/{id}/commands", "POST", "developer_2", "Run approved commands (stdout/stderr/exitCode)", "Software Development"),
    ("/api/v1/executions/{id}/tests", "POST", "developer_2", "Run unit/integration/E2E tests (test report)", "Software Development"),
    ("/api/v1/executions/{id}/security-scan", "POST", "developer_2", "Security scan (security report)", "Software Development"),
    ("/api/v1/executions/{id}/artifacts", "GET", "developer_2", "Return generated artifacts", "Software Development"),

    # Anshif - Dev3
    ("/api/v1/memory/search", "POST", "developer_3", "Retrieve Obsidian/company knowledge", "Memory"),
    ("/api/v1/memory/research", "POST", "developer_3", "Controlled external research", "Memory"),
    ("/api/v1/memory/validate", "POST", "developer_3", "Validate evidence before trust", "Memory"),
    ("/api/v1/memory/write", "POST", "developer_3", "Write approved state/knowledge", "Memory"),
    ("/api/v1/memory/context/{taskId}", "GET", "developer_3", "Task context + sources", "Memory"),
    ("/api/v1/twins/resolve", "POST", "developer_3", "Determine strategic need", "Executive Twins"),
    ("/api/v1/twins/{id}/activate", "POST", "developer_3", "Activate CEO/COO/CTO/CMO/CFO", "Executive Twins"),
    ("/api/v1/twins/{id}/recommend", "POST", "developer_3", "Strategic recommendation", "Executive Twins"),
    ("/api/v1/twins/{id}/delegate", "POST", "developer_3", "Delegate concrete work", "Executive Twins"),
    ("/api/v1/twins/{id}/review", "POST", "developer_3", "Review project result", "Executive Twins"),
    ("/api/v1/agents", "GET", "developer_3", "Registry/filter specialists", "Specialists"),
    ("/api/v1/agents/spawn", "POST", "developer_3", "Spawn worker", "Specialists"),
    ("/api/v1/agents/{id}/assign", "POST", "developer_3", "Assign task/step", "Specialists"),
    ("/api/v1/agents/{id}/terminate", "POST", "developer_3", "Terminate completed worker", "Specialists"),
    ("/api/v1/agents/{id}", "GET", "developer_3", "Status/progress/tools/model", "Specialists"),
    ("/api/v1/events", "GET", "developer_3", "Activity feed", "Events"),
    ("/api/v1/ws/tasks/{id}", "WS", "developer_3", "Live task/workforce updates", "Events"),
    ("/api/v1/projects/{id}", "GET", "developer_3", "Project state, artifacts", "Project/Walkthrough"),
    ("/api/v1/projects/{id}/walkthrough", "GET", "developer_3", "Final walkthrough", "Project/Walkthrough"),
]

DOD_ITEMS = [
    ("Basic Mode can enter, route, execute, verify and return a result.", "Bharath"),
    ("Advanced Project Mode can initialize a project and create a versioned plan.", "Bharath"),
    ("Memory retrieves from the supplied Obsidian knowledge base.", "Anshif"),
    ("Capability Manager resolves capability to worker/tool/model requirements.", "Bharath"),
    ("Guardrail returns allow/block/escalate with audit record.", "Bharath"),
    ("Executive Twin activates when strategic reasoning is required and delegates to specialists.", "Anshif"),
    ("Specialists can spawn, assign, run, verify, complete and terminate.", "Anshif"),
    ("Software Development creates/modifies a controlled project and runs tests.", "Dhanuja"),
    ("Verification produces objective evidence.", "Bharath & Dhanuja"),
    ("Reflection/Re-plan operates from verification evidence.", "Bharath"),
    ("Retry is bounded and observable.", "Bharath"),
    ("Frontend receives real task/agent/project events.", "Anshif"),
    ("Approved results can be written to Obsidian.", "Anshif"),
    ("Typecheck, production build and core integration tests pass.", "Bharath, Dhanuja & Anshif"),
]


def seed_if_empty(db: Session):
    if db.query(models.Developer).count() > 0:
        return

    dev_by_code = {}
    for d in DEVELOPERS:
        dev = models.Developer(**d)
        db.add(dev)
        db.flush()
        dev_by_code[d["code"]] = dev

    api_by_endpoint = {}
    for endpoint, method, owner_code, purpose, category in API_CATALOG:
        api = models.APIItem(
            endpoint=endpoint,
            method=method,
            owner_id=dev_by_code[owner_code].id,
            purpose=purpose,
            category=category,
            status="Not Started",
            tested=False,
            verification_status="Pending",
        )
        db.add(api)
        api_by_endpoint[endpoint] = api
    db.flush()

    for dev_code, days in DELIVERABLES.items():
        dev = dev_by_code[dev_code]
        for day, deliverable in days.items():
            date_str = (TODAY + datetime.timedelta(days=day - 1)).isoformat()
            module = MODULE_BY_DAY[dev_code][day]
            wi = models.WorkItem(
                developer_id=dev.id,
                day=day,
                date=date_str,
                module=module,
                description=deliverable,
                tasks_completed="",
                status="Pending",
                evidence="",
                verification_status="Pending",
                issues_blockers="",
                next_planned_work=DELIVERABLES[dev_code].get(day + 1, "Day-7 completion review"),
                is_seed=True,
            )
            db.add(wi)
    db.flush()

    for i, (requirement, owner) in enumerate(DOD_ITEMS):
        db.add(models.DefinitionOfDone(
            requirement=requirement,
            owner=owner,
            status="Not Started",
            evidence="",
            verification="Pending",
            notes="",
            order_index=i + 1,
        ))

    db.add(models.Activity(
        event_type="task.created",
        developer_id=None,
        work_item_id=None,
        source="dashboard",
        status="info",
        payload="Autonomous AI Workforce dashboard initialized. Seeded 3 developers, 21 planned work items, "
                f"{len(API_CATALOG)} tracked APIs and 14 Day-7 Definition of Done requirements.",
    ))

    db.commit()
