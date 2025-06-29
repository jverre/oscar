import * as vscode from 'vscode';

export class OscarStatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private isAuthenticated: boolean = false;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'oscar.signIn';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    public setAuthenticationStatus(isAuthenticated: boolean): void {
        this.isAuthenticated = isAuthenticated;
        this.updateStatusBar();
    }

    public getAuthenticationStatus(): boolean {
        return this.isAuthenticated;
    }

    private updateStatusBar(): void {
        if (this.isAuthenticated) {
            this.statusBarItem.text = '$(check) Oscar running';
            this.statusBarItem.tooltip = 'Oscar is connected - click to sign out or sync';
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            this.statusBarItem.command = 'oscar.showMenu';
        } else {
            this.statusBarItem.text = 'Sign in to Oscar';
            this.statusBarItem.tooltip = 'Click to sign in to Oscar and start syncing Claude Code chats';
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            this.statusBarItem.command = 'oscar.signIn';
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}