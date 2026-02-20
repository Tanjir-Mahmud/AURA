/**
 * System Health & Agent Status API Route
 * GET: returns MAS orchestrator health, agent statuses, and recent messages
 */
import { NextResponse } from 'next/server';
import { getSystemHealth, getRecentMessages, getTasks } from '@/agents/orchestrator';

export async function GET() {
    try {
        const health = getSystemHealth();
        const messages = getRecentMessages(10);
        const pendingTasks = getTasks({ status: 'pending' });
        const recentCompleted = getTasks({ status: 'completed' });

        return NextResponse.json({
            health,
            recentMessages: messages,
            pendingTasks: pendingTasks.slice(0, 10),
            recentCompleted: recentCompleted.slice(-10),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Health check failed' },
            { status: 500 }
        );
    }
}
