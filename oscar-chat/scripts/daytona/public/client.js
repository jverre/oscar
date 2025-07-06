class ClaudeCodeWebTerminal {
    constructor() {
        this.socket = null;
        this.terminal = null;
        this.fitAddon = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.init();
    }
    
    init() {
        this.initTerminal();
        this.connect();
        this.setupEventListeners();
    }
    
    initTerminal() {
        // Create terminal instance
        this.terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Courier New, monospace',
            theme: {
                background: '#1a1a1a',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#ffffff20'
            },
            // Enhanced color support
            allowTransparency: true,
            drawBoldTextInBrightColors: true,
            convertEol: true
        });
        
        // Add fit addon
        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        
        // Open terminal in container
        this.terminal.open(document.getElementById('terminal'));
        
        // Fit terminal to container
        this.fitAddon.fit();
        
        // Handle terminal input
        this.terminal.onData((data) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'input',
                    data: data
                }));
            }
        });
        
        // Handle terminal resize
        this.terminal.onResize((size) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'resize',
                    cols: size.cols,
                    rows: size.rows
                }));
            }
        });
    }
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.updateConnectionStatus('connecting');
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus('connected');
            this.reconnectAttempts = 0;
            
            // Send initial terminal size
            this.socket.send(JSON.stringify({
                type: 'resize',
                cols: this.terminal.cols,
                rows: this.terminal.rows
            }));
        };
        
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'output') {
                    this.terminal.write(message.data);
                } else if (message.type === 'exit') {
                    this.terminal.write('\r\n\r\n[Process exited]');
                    this.updateConnectionStatus('disconnected');
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
        
        this.socket.onclose = (event) => {
            console.log('WebSocket closed', event);
            this.updateConnectionStatus('disconnected');
            this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('disconnected');
        };
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.updateConnectionStatus('connecting');
            
            setTimeout(() => {
                console.log(`Reconnection attempt ${this.reconnectAttempts}`);
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.terminal.write('\r\n\r\n[Connection failed. Please refresh the page.]');
        }
    }
    
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        statusElement.className = `connection-status ${status}`;
        
        const statusText = {
            connecting: 'Connecting...',
            connected: 'Connected',
            disconnected: 'Disconnected'
        };
        
        statusElement.textContent = statusText[status] || status;
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fitAddon.fit();
            }
        });
        
        // Focus terminal on click
        document.addEventListener('click', () => {
            this.terminal.focus();
        });
        
        // Initial focus
        this.terminal.focus();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClaudeCodeWebTerminal();
});