/**
 * MAS Agent Types — Shared interfaces for the Multi-Agent System
 * 
 * MCP-compatible message protocol for inter-agent communication.
 */

export type AgentType =
    | 'orchestrator'
    | 'compliance'
    | 'warehouse'
    | 'regulatory_scout'
    | 'passport_generator'
    | 'fit_verification';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface AgentMessage {
    id: string;
    from: AgentType;
    to: AgentType;
    type: 'task_request' | 'task_result' | 'event' | 'alert' | 'heartbeat';
    priority: TaskPriority;
    payload: unknown;
    timestamp: string;
    correlationId?: string;
}

export interface AgentTask {
    id: string;
    type: string;
    priority: TaskPriority;
    status: TaskStatus;
    assignedAgent: AgentType;
    input: unknown;
    output?: unknown;
    error?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    retryCount: number;
    maxRetries: number;
}

export interface AgentHealth {
    agent: AgentType;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastHeartbeat: string;
    tasksCompleted: number;
    tasksFailed: number;
    avgResponseTimeMs: number;
}

export interface ExternalServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: string;
}

export interface SystemHealthReport {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    agents: AgentHealth[];
    externalServices: ExternalServiceHealth[];
    pendingTasks: number;
    totalProcessed: number;
}

export interface AgentConfig {
    type: AgentType;
    name: string;
    description: string;
    capabilities: string[];
    maxConcurrentTasks: number;
    healthCheckIntervalMs: number;
}

// ─── Task Type Definitions ─────────────────────────

export interface VoiceIntakeTask {
    type: 'voice_intake';
    audioBuffer: ArrayBuffer;
    operatorId: string;
    warehouseId: string;
}

export interface PassportGenerationTask {
    type: 'passport_generation';
    productId: string;
    ilcrId: string;
    format: 'pdf' | 'json';
}

export interface ComplianceCheckTask {
    type: 'compliance_check';
    productId: string;
    targetRegulation: 'EU_ESPR' | 'GS1' | 'ALL';
}

export interface FitScoreTask {
    type: 'fit_score';
    bodyMeasurements: Record<string, number>;
    productId: string;
}

export interface RegulatoryScanTask {
    type: 'regulatory_scan';
    categories?: string[];
    scheduleType: 'manual' | 'daily' | 'weekly';
}

export type AnyTask =
    | VoiceIntakeTask
    | PassportGenerationTask
    | ComplianceCheckTask
    | FitScoreTask
    | RegulatoryScanTask;
