import type { TokenOverridable } from './common';
export interface WorkflowsStepCompletedArguments extends TokenOverridable {
    workflow_step_execute_id: string;
    outputs?: Record<string, unknown>;
}
export interface WorkflowsStepFailedArguments extends TokenOverridable {
    workflow_step_execute_id: string;
    error: {
        message: string;
    };
}
export interface WorkflowsUpdateStepArguments extends TokenOverridable {
    workflow_step_edit_id: string;
    step_image_url?: string;
    step_name?: string;
    inputs?: {
        [name: string]: {
            value: any;
            skip_variable_replacement?: boolean;
            variables?: {
                [key: string]: any;
            };
        };
    };
    outputs?: {
        type: string;
        name: string;
        label: string;
    }[];
}
//# sourceMappingURL=workflows.d.ts.map