import { executeCompareReferences } from './compareReferences';
import { executePing } from './ping';
import { executeSetTerminalTitle } from './setTerminalTitle';

export type CommandName =
    | 'compareReferences'
    | 'ping'
    | 'setTerminalTitle';

export interface CliResult {
    success: boolean;
    message: string;
    error?: string;
    logs?: string[];
}

export type CommandHandler = (args: string[], logger?: (msg: string) => void) => Promise<CliResult>;
export type CommandRegistry = Record<CommandName, CommandHandler>;

export const commandRegistry: CommandRegistry = {
    compareReferences: executeCompareReferences,
    ping: executePing,
    setTerminalTitle: executeSetTerminalTitle
};

// Convert to Map for compatibility with existing code
export function createCommandHandlersMap(): Map<string, CommandHandler> {
    return new Map(Object.entries(commandRegistry));
}
