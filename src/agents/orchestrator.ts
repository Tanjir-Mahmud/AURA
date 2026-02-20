/**
 * MAS Orchestrator — The Brain of the Aura System
 * 
 * Routes tasks to specialized agents, manages priorities,
 * handles failures, and maintains system health.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
    AgentType,
    AgentMessage,
    AgentTask,
    AgentHealth,
    AnyTask,
    TaskPriority,
    SystemHealthReport,
} from './types';

// ─── Agent Registry ────────────────────────────────

const agentCapabilities: Record<AgentType, string[]> = {
    orchestrator: ['routing', 'monitoring', 'scheduling'],
    compliance: ['compliance_check', 'field_validation', 'regulation_mapping'],
    warehouse: ['voice_intake', 'inventory_update', 'condition_assessment'],
    regulatory_scout: ['regulatory_scan', 'schema_migration', 'alert_generation'],
    passport_generator: ['passport_generation', 'pdf_creation', 'qr_generation', 'bulk_generation'],
    fit_verification: ['fit_score', 'virtual_tryon', 'size_recommendation'],
};

// ─── State ─────────────────────────────────────────

const taskQueue: AgentTask[] = [];
const messageLog: AgentMessage[] = [];
const agentHealth: Map<AgentType, AgentHealth> = new Map();

// Initialize health for all agents
const allAgents: AgentType[] = [
    'orchestrator', 'compliance', 'warehouse',
    'regulatory_scout', 'passport_generator', 'fit_verification',
];

const externalServices = [
    'supabase', 'sanity', 'foxit', 'you_com', 'perfect_corp', 'deepgram'
];

allAgents.forEach((agent) => {
    agentHealth.set(agent, {
        agent,
        status: 'healthy',
        lastHeartbeat: new Date().toISOString(),
        tasksCompleted: 0,
        tasksFailed: 0,
        avgResponseTimeMs: 0,
    });
});

// ─── Core Functions ────────────────────────────────

/**
 * Route a task to the appropriate agent
 */
export function routeTask(task: AnyTask, priority: TaskPriority = 'medium'): AgentTask {
    const targetAgent = resolveAgent(task.type);

    const agentTask: AgentTask = {
        id: uuidv4(),
        type: task.type,
        priority,
        status: 'pending',
        assignedAgent: targetAgent,
        input: task,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
    };

    taskQueue.push(agentTask);

    // Send message to agent
    sendMessage({
        id: uuidv4(),
        from: 'orchestrator',
        to: targetAgent,
        type: 'task_request',
        priority,
        payload: agentTask,
        timestamp: new Date().toISOString(),
        correlationId: agentTask.id,
    });

    return agentTask;
}

/**
 * Resolve which agent should handle a task type
 */
function resolveAgent(taskType: string): AgentType {
    for (const [agent, capabilities] of Object.entries(agentCapabilities)) {
        if (capabilities.includes(taskType)) {
            return agent as AgentType;
        }
    }
    throw new Error(`No agent found for task type: ${taskType}`);
}

/**
 * Send an inter-agent message
 */
export function sendMessage(message: AgentMessage): void {
    messageLog.push(message);
    // In a production system, this would use a message bus (Redis, NATS, etc.)
    console.log(`[MAS] ${message.from} → ${message.to}: ${message.type} (${message.priority})`);
}

/**
 * Update task status
 */
export function updateTaskStatus(
    taskId: string,
    status: AgentTask['status'],
    output?: unknown,
    error?: string
): AgentTask | null {
    const task = taskQueue.find((t) => t.id === taskId);
    if (!task) return null;

    task.status = status;
    if (output) task.output = output;
    if (error) task.error = error;

    if (status === 'in_progress') {
        task.startedAt = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
        task.completedAt = new Date().toISOString();

        // Update agent health
        const health = agentHealth.get(task.assignedAgent);
        if (health) {
            if (status === 'completed') health.tasksCompleted++;
            if (status === 'failed') health.tasksFailed++;

            const duration = task.startedAt
                ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
                : 0;
            health.avgResponseTimeMs =
                (health.avgResponseTimeMs * (health.tasksCompleted + health.tasksFailed - 1) + duration) /
                (health.tasksCompleted + health.tasksFailed);
        }
    }

    // Send result message
    sendMessage({
        id: uuidv4(),
        from: task.assignedAgent,
        to: 'orchestrator',
        type: 'task_result',
        priority: task.priority,
        payload: { taskId, status, output, error },
        timestamp: new Date().toISOString(),
        correlationId: task.id,
    });

    return task;
}

/**
 * Get all tasks with optional filtering
 */
export function getTasks(filters?: {
    status?: AgentTask['status'];
    agent?: AgentType;
    priority?: TaskPriority;
}): AgentTask[] {
    let tasks = [...taskQueue];
    if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
    if (filters?.agent) tasks = tasks.filter((t) => t.assignedAgent === filters.agent);
    if (filters?.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
    return tasks.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Get system-wide health status
 */
export function getSystemHealth(): SystemHealthReport {
    const agents = Array.from(agentHealth.values());
    const unhealthyCount = agents.filter((a) => a.status === 'unhealthy').length;
    const degradedCount = agents.filter((a) => a.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) overall = 'unhealthy';
    else if (degradedCount > 0) overall = 'degraded';

    return {
        overall,
        agents,
        externalServices: externalServices.map(service => ({
            name: service,
            status: 'healthy', // In production, this would do a ping/head request
            lastCheck: new Date().toISOString()
        })),
        pendingTasks: taskQueue.filter((t) => t.status === 'pending').length,
        totalProcessed: taskQueue.filter((t) => t.status === 'completed' || t.status === 'failed').length,
    };
}

/**
 * Get recent messages for monitoring
 */
export function getRecentMessages(limit: number = 20): AgentMessage[] {
    return messageLog.slice(-limit);
}
