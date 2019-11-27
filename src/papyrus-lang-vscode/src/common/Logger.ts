import { createDecorator } from 'decoration-ioc';

import { window, OutputChannel, ExtensionContext } from 'vscode';

import { IExtensionContext } from '../common/vscode/IocDecorators';

export interface ILogger {
    debug(msg: string): Promise<void>;
    info(msg: string): Promise<void>;
    warn(msg: string): Promise<void>;
    error(msg: string): Promise<void>;
}

export class Logger implements ILogger {
    private readonly _context: ExtensionContext;
    static outputChannel: OutputChannel;

    constructor(
        @IExtensionContext context: ExtensionContext
    ) {
        this._context = context;
        if (!Logger.outputChannel) {
            Logger.outputChannel = window.createOutputChannel(`Papyrus`);
        }
    }

    public async debug(msg: string): Promise<void> {

    }
    public async info(msg: string): Promise<void> {

    }
    public async warn(msg: string): Promise<void> {

    }
    public async error(msg: string): Promise<void> {

    }
}

export const ILogger = createDecorator<ILogger>('logger');