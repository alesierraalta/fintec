'use client';

import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface ApprovalDialogProps {
    open: boolean;
    data: any; // ApprovalRequest data
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
    loading: boolean;
}

export function ApprovalDialog({ open, data, onApprove, onReject, loading }: ApprovalDialogProps) {
    if (!data) return null;

    return (
        <AlertDialog open={open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Action Approval Required</AlertDialogTitle>
                    <AlertDialogDescription>
                        The AI agent wants to perform the following action:
                        <br /><br />
                        <span className="font-semibold">{data.message}</span>
                        <br /><br />
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(data.action_data, null, 2)}
                        </pre>
                        <br />
                        Risk Level: <span className={`font-bold ${data.risk_level === 'HIGH' ? 'text-destructive' : 'text-orange-500'}`}>{data.risk_level}</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onReject(data.id)} disabled={loading}>
                        Reject
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => onApprove(data.id)} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
