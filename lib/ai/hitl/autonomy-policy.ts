export interface AutonomyPolicy {
    [actionType: string]: {
        autoApprove: boolean | ((context: any) => boolean);
        requireApproval?: (context: any) => boolean;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
}

export const DEFAULT_AUTONOMY_POLICY: AutonomyPolicy = {
    createTransaction: {
        autoApprove: (ctx: any) => Math.abs(ctx.amount) < 100, // Auto-approve small transactions
        requireApproval: (ctx: any) => Math.abs(ctx.amount) >= 100,
        riskLevel: 'MEDIUM'
    },
    createGoal: {
        autoApprove: false, // Always require human approval
        riskLevel: 'HIGH'
    },
    getTransactions: {
        autoApprove: true, // Read-only, safe
        riskLevel: 'LOW'
    },
    getAccountBalance: {
        autoApprove: true,
        riskLevel: 'LOW'
    }
};

export function shouldRequestApproval(
    actionType: string,
    context: any,
    policy: AutonomyPolicy = DEFAULT_AUTONOMY_POLICY
): boolean {
    const rule = policy[actionType];

    if (!rule) return false; // Unknown action, default to allow/pass (or deny depending on security stance, here allow for UX)

    // Explicit approval required
    if (typeof rule.requireApproval === 'function' && rule.requireApproval(context)) {
        return true;
    }

    // Check auto-approve
    if (typeof rule.autoApprove === 'function') {
        return !rule.autoApprove(context);
    }

    return !rule.autoApprove;
}
