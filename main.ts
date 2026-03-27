/**
 * Voice Serial for MakeCode - Browser voice recognition + micro:bit control
 * 浏览器语音识别 + micro:bit 串口控制扩展
 * 
 * 版本: 1.0.3
 * 更新: 简化参数类型，移除 problematic dropdown
 * 作者: jiahuaYao
 * 许可证: MIT
 */

//% color=#2E8B57 icon="\uf130" block="语音识别"
//% groups="['Setup:设置', 'Events:事件', 'Actions:动作', 'Advanced:高级']"
namespace voiceSerial {
    
    // ========== 内部状态 ==========
    let _initialized: boolean = false;
    let _connected: boolean = false;
    let _listening: boolean = false;
    let _threshold: number = 0.7;
    let _lastCommand: string = "";
    let _commandCount: number = 0;
    const _keywordHandlers: { [keyword: string]: () => void } = {};
    let _serialDataHandler: (data: string) => void = null;
    let _simEnabled: boolean = false;

    // ========== 设置类积木 ==========

    //% block="初始化语音识别 语言 %lang"
    //% lang.defl="zh-CN"
    //% group="Setup:设置"
    export function initialize(lang: string = "zh-CN"): void {
        _initialized = true;
        sendSimMessage("voice-init", lang);
    }

    //% block="连接 micro:bit USB"
    //% group="Setup:设置"
    export function connectMicrobit(): void {
        if (!_initialized) {
            basic.showString("?");
            return;
        }
        sendSimMessage("serial-connect", "115200");
        basic.showIcon(IconNames.Yes);
        basic.pause(100);
        basic.clearScreen();
    }

    //% block="设置置信度阈值 %threshold"
    //% threshold.min=0 threshold.max=1 threshold.defl=0.7 step=0.1
    //% group="Setup:设置"
    export function setThreshold(threshold: number): void {
        _threshold = Math.max(0, Math.min(1, threshold));
        sendSimMessage("set-threshold", _threshold.toString());
    }

    // ========== 事件类积木 ==========

    //% block="当识别到关键词 %keyword 时"
    //% keyword.defl="你好"
    //% group="Events:事件"
    export function onKeyword(keyword: string, handler: () => void): void {
        _keywordHandlers[keyword] = handler;
        sendSimMessage("register-keyword", keyword);
        setupSimListener();
    }

    //% block="当串口收到数据时"
    //% group="Events:事件"
    //% advanced=true
    export function onSerialDataReceived(handler: (data: string) => void): void {
        _serialDataHandler = handler;
        setupSimListener();
    }

    // ========== 动作类积木（关键修改：简单字符串参数）==========

    /**
     * 显示指定标签并通知 micro:bit
     * 标签直接输入，无 dropdown
     */
    //% block="显示标签 %label 并通知 micro:bit"
    //% label.defl="笑脸"
    //% group="Actions:动作"
    export function showLabel(label: string): void {
        // 防御：确保是字符串
        const safeLabel = String(label || "笑脸");
        
        const labelMap: { [key: string]: string } = {
            "笑脸": "SMILE",
            "哭脸": "SAD",
            "爱心": "HEART",
            "星星": "STAR",
            "小狗": "DOG",
            "小猫": "CAT",
            "小鸟": "BIRD",
            "音乐": "MUSIC",
            "灯泡": "LIGHT",
            "铃铛": "BELL",
            "汽车": "CAR",
            "房子": "HOME"
        };
        
        const command = labelMap[safeLabel] || "SMILE";
        showLocalLabel(safeLabel);
        basic.pause(100);
        sendCommand(command);
    }

    //% block="发送命令 %command 到 micro:bit"
    //% command.defl="SMILE"
    //% group="Actions:动作"
    export function sendCommand(command: string): void {
        const safeCommand = String(command || "SMILE");
        _lastCommand = safeCommand;
        _commandCount++;
        sendSimMessage("serial-send", safeCommand);
        if (safeCommand.length > 0) {
            basic.showString(safeCommand.charAt(0), 80);
        }
    }

    //% block="发送原始数据 %data 到 micro:bit"
    //% group="Actions:动作"
    //% advanced=true
    export function sendRaw(data: string): void {
        sendCommand(String(data));
    }

    //% block="断开 micro:bit 连接"
    //% group="Actions:动作"
    //% advanced=true
    export function disconnect(): void {
        _connected = false;
        _listening = false;
        sendSimMessage("serial-disconnect", "");
        basic.showIcon(IconNames.No);
        basic.pause(200);
        basic.clearScreen();
    }

    // ========== 高级积木 ==========

    //% block="最后发送的命令"
    //% group="Advanced:高级"
    //% advanced=true
    export function lastCommand(): string {
        return _lastCommand;
    }

    //% block="发送命令总数"
    //% group="Advanced:高级"
    //% advanced=true
    export function commandsSent(): number {
        return _commandCount;
    }

    //% block="正在监听"
    //% group="Advanced:高级"
    //% advanced=true
    export function isListening(): boolean {
        return _listening;
    }

    //% block="已连接"
    //% group="Advanced:高级"
    //% advanced=true
    export function isConnected(): boolean {
        return _connected;
    }

    //% block="停止语音识别"
    //% group="Advanced:高级"
    //% advanced=true
    export function stopRecognition(): void {
        _listening = false;
        sendSimMessage("voice-stop", "");
        basic.showIcon(IconNames.No);
        basic.pause(200);
        basic.clearScreen();
    }

    // ========== 内部函数 ==========

    function sendSimMessage(type: string, data: string): void {
        try {
            const buf = Buffer.fromUTF8(JSON.stringify({ type, data, timestamp: control.millis() }));
            control.simmessages.send("voice-serial", buf);
        } catch (e) {
            console.log("[VS] " + type + ": " + data);
        }
    }

    function setupSimListener(): void {
        if (_simEnabled) return;
        try {
            control.simmessages.onReceived("voice-serial", (buf: Buffer) => {
                const msg = JSON.parse(buf.toString());
                handleSimMessage(msg);
            });
            _simEnabled = true;
        } catch (e) {}
    }

    function handleSimMessage(msg: any): void {
        switch (msg.type) {
            case "keyword-detected":
                if (_keywordHandlers[msg.data]) _keywordHandlers[msg.data]();
                break;
            case "serial-received":
                if (_serialDataHandler) _serialDataHandler(msg.data);
                break;
            case "connected":
                _connected = true;
                basic.showIcon(IconNames.Yes);
                break;
            case "disconnected":
                _connected = false;
                _listening = false;
                break;
            case "listening":
                _listening = true;
                break;
            case "stopped":
                _listening = false;
                break;
        }
    }

    function showLocalLabel(label: string): void {
        switch (label) {
            case "笑脸":
                basic.showIcon(IconNames.Happy);
                break;
            case "哭脸":
                basic.showIcon(IconNames.Sad);
                break;
            case "爱心":
                basic.showIcon(IconNames.Heart);
                break;
            case "星星":
                basic.showIcon(IconNames.Yes);
                break;
            case "小狗":
                basic.showLeds(`
                    . . # . .
                    . # # # .
                    . # # # .
                    # . . . #
                    . # # # .
                `);
                break;
            case "小猫":
                basic.showLeds(`
                    . # . # .
                    # # # # #
                    # # # # #
                    . # # # .
                    . . # . .
                `);
                break;
            case "小鸟":
                basic.showLeds(`
                    . . # . .
                    . # # # .
                    # # # # #
                    . # . # .
                    . # . # .
                `);
                break;
            case "音乐":
                basic.showIcon(IconNames.EigthNote);
                break;
            case "灯泡":
                basic.showIcon(IconNames.Target);
                break;
            case "铃铛":
                basic.showIcon(IconNames.Pitchfork);
                break;
            case "汽车":
                basic.showIcon(IconNames.Triangle);
                break;
            case "房子":
                basic.showIcon(IconNames.Square);
                break;
            default:
                basic.showString(label.charAt(0), 100);
        }
    }
}
