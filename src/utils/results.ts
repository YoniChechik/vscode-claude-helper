import { CliResult } from '../commands/registry';

export function createSuccessResult(message: string, logs?: string[]): CliResult {
    return {
        success: true,
        message,
        logs
    };
}

export function createErrorResult(error: string, logs?: string[]): CliResult {
    return {
        success: false,
        message: '',
        error,
        logs
    };
}

export function handleCommandError(error: unknown, logs?: string[]): CliResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResult(errorMessage, logs);
}
