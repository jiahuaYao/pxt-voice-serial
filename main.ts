/**
 * Voice Serial for MakeCode - Browser voice recognition + micro:bit control
 * 浏览器语音识别 + micro:bit 串口控制扩展
 * 
 * 版本: 1.0.5
 * 作者: jiahuaYao
 * 更新: 简化语言选项，使用枚举实现可靠下拉菜单
 * 许可证: MIT
 */

// ========== 语言枚举（仅保留实际有效的语言）==========

enum VoiceLanguage {
    //% block="中文"
    Chinese = "zh-CN",
    //% block="英文"
    English = "en-US"
}

// ========== 标签枚举（12个常用词汇）==========

enum VoiceLabel {
    //% block="笑脸"
    Smile = "笑脸",
    //% block="哭脸"
    Sad = "哭脸",
    //% block="爱心"
    Heart = "爱心",
    //% block="星星"
    Star = "星星",
    //% block="小狗"
    Dog = "小狗",
    //% block="小猫"
    Cat = "小猫",
    //% block="小鸟"
    Bird = "小鸟",
    //% block="音乐"
    Music = "音乐",
    //% block="灯泡"
    Light = "灯泡",
    //% block="铃铛"
    Bell = "铃铛",
    //% block="汽车"
    Car = "汽车",
    //% block="房子"
    Home = "房子"
}

//% color=#2E8B57 icon="\uf130" block="语音识别"
//% groups="['Setup:设置', 'Events:事件', 'Actions:动作', 'Advanced:高级']"
namespace voiceSerial {
    
    // ========== 内部状态变量 ==========
    let _initialized: boolean = false;
    let _connected: boolean = false;
    let _listening: boolean = false;
    let _threshold: number = 0.7;
    let _language: string = "zh-CN";
    let _lastCommand: string = "";
    let _commandCount: number = 0;
    
    // 事件处理器存储
    const _keywordHandlers: { [keyword: string]: () => void } = {};
    let _serialDataHandler: (data: string) => void = null;
    
    // 模拟器通信状态
    let _simEnabled: boolean = false;

    // ========== 设置类积木 ==========

    /**
     * Initialize voice recognition with specified language
     * 初始化语音识别（仅支持中文和英文，Web Speech API 实际有效的语言）
     */
    //% block="初始化语音识别 语言 %lang"
    //% lang.defl=VoiceLanguage.Chinese
    //% group="Setup:设置"
    export function initialize(lang: VoiceLanguage): void {
        const langStr = lang === VoiceLanguage.English ? "en-US" : "zh-CN";
        _language = langStr;
        _initialized = true;
        
        sendSimMessage("voice-init", langStr);
        console.log("Voice recognition initialized: " + langStr);
    }

    /**
     * Connect to micro:bit via Web Serial API
     * 通过 Web Serial API 连接 micro:bit
     */
    //% block="连接 micro:bit USB"
    //% group="Setup:设置"
    export function connectMicrobit(): void {
        if (!_initialized) {
            console.warn("Please initialize voice recognition first!");
            basic.showString("?");
            return;
        }
        
        sendSimMessage("serial-connect", "115200");
        console.log("Connecting to micro:bit...");
        
        // 显示连接中状态
        basic.showIcon(IconNames.Yes);
        basic.pause(100);
        basic.clearScreen();
    }

    /**
     * Set confidence threshold for voice recognition (0.0 - 1.0)
     * 设置语音识别置信度阈值
     */
    //% block="设置置信度阈值 %threshold"
    //% threshold.min=0 threshold.max=1 threshold.defl=0.7 threshold.step=0.1
    //% group="Setup:设置"
    export function setThreshold(threshold: number): void {
        _threshold = Math.max(0, Math.min(1, threshold));
        sendSimMessage("set-threshold", _threshold.toString());
        console.log("Threshold set to: " + _threshold);
    }

    // ========== 事件类积木 ==========

    /**
     * Do something when a keyword is recognized
     * 当识别到指定关键词时执行
     */
    //% block="当识别到关键词 %keyword 时"
    //% keyword.defl="你好"
    //% draggableParameters=reporter
    //% blockId=voiceSerial_onKeyword
    //% group="Events:事件"
    export function onKeyword(keyword: string, handler: () => void): void {
        _keywordHandlers[keyword] = handler;
        sendSimMessage("register-keyword", keyword);
        console.log("Registered keyword: " + keyword);
        
        setupSimListener();
    }

    /**
     * Do something when serial data is received from micro:bit
     * 当从 micro:bit 收到串口数据时执行
     */
    //% block="当串口收到数据时"
    //% draggableParameters=reporter
    //% blockId=voiceSerial_onSerialData
    //% group="Events:事件"
    //% advanced=true
    export function onSerialDataReceived(handler: (data: string) => void): void {
        _serialDataHandler = handler;
        setupSimListener();
    }

    // ========== 动作类积木（使用枚举实现可靠下拉菜单）==========

    /**
     * Show label on screen and send corresponding command to micro:bit
     * 显示标签并发送对应命令到 micro:bit
     */
    //% block="显示 %label 并通知 micro:bit"
    //% label.defl=VoiceLabel.Smile
    //% group="Actions:动作"
    export function showLabel(label: VoiceLabel): void {
        // 将枚举值转换为字符串
        const labelStr = voiceLabelToString(label);
        
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
        
        const command = labelMap[labelStr] || "SMILE";
        
        // 显示对应图案
        showLocalLabel(labelStr);
        basic.pause(100);
        
        // 发送命令
        sendCommand(command);
    }

    /**
     * Send a command string to micro:bit via serial
     * 发送命令字符串到 micro:bit
     */
    //% block="发送命令 %command 到 micro:bit"
    //% command.defl="SMILE"
    //% group="Actions:动作"
    export function sendCommand(command: string): void {
        const safeCommand = String(command || "SMILE");
        _lastCommand = safeCommand;
        _commandCount++;
        
        sendSimMessage("serial-send", safeCommand);
        console.log("Command sent: " + safeCommand);
        
        // 本地显示反馈（首字母）
        if (safeCommand.length > 0) {
            basic.showString(safeCommand.charAt(0), 80);
        }
    }

    /**
     * Send raw data to micro:bit via serial
     * 发送原始数据到 micro:bit（高级）
     */
    //% block="发送原始数据 %data 到 micro:bit"
    //% group="Actions:动作"
    //% advanced=true
    export function sendRaw(data: string): void {
        sendCommand(String(data));
    }

    /**
     * Disconnect from micro:bit
     * 断开与 micro:bit 的连接
     */
    //% block="断开 micro:bit 连接"
    //% group="Actions:动作"
    //% advanced=true
    export function disconnect(): void {
        _connected = false;
        _listening = false;
        
        sendSimMessage("serial-disconnect", "");
        console.log("Disconnected from micro:bit");
        
        // 本地显示断开状态
        basic.showIcon(IconNames.No);
        basic.pause(200);
        basic.clearScreen();
    }

    // ========== 高级积木 ==========

    /**
     * Get the last sent command
     * 获取最后发送的命令
     */
    //% block="最后发送的命令"
    //% group="Advanced:高级"
    //% advanced=true
    export function lastCommand(): string {
        return _lastCommand;
    }

    /**
     * Get total commands sent count
     * 获取发送命令的总数
     */
    //% block="发送命令总数"
    //% group="Advanced:高级"
    //% advanced=true
    export function commandsSent(): number {
        return _commandCount;
    }

    /**
     * Check if voice recognition is active
     * 检查语音识别是否正在运行
     */
    //% block="正在监听"
    //% group="Advanced:高级"
    //% advanced=true
    export function isListening(): boolean {
        return _listening;
    }

    /**
     * Check if micro:bit is connected
     * 检查 micro:bit 是否已连接
     */
    //% block="已连接"
    //% group="Advanced:高级"
    //% advanced=true
    export function isConnected(): boolean {
        return _connected;
    }

    /**
     * Stop voice recognition
     * 停止语音识别
     */
    //% block="停止语音识别"
    //% group="Advanced:高级"
    //% advanced=true
    export function stopRecognition(): void {
        _listening = false;
        sendSimMessage("voice-stop", "");
        console.log("Voice recognition stopped");
        
        basic.showIcon(IconNames.No);
        basic.pause(200);
        basic.clearScreen();
    }

    // ========== 内部辅助函数 ==========

    /**
     * Convert VoiceLabel enum to string
     * 将 VoiceLabel 枚举转换为字符串
     */
    function voiceLabelToString(label: VoiceLabel): string {
        switch (label) {
            case VoiceLabel.Smile: return "笑脸";
            case VoiceLabel.Sad: return "哭脸";
            case VoiceLabel.Heart: return "爱心";
            case VoiceLabel.Star: return "星星";
            case VoiceLabel.Dog: return "小狗";
            case VoiceLabel.Cat: return "小猫";
            case VoiceLabel.Bird: return "小鸟";
            case VoiceLabel.Music: return "音乐";
            case VoiceLabel.Light: return "灯泡";
            case VoiceLabel.Bell: return "铃铛";
            case VoiceLabel.Car: return "汽车";
            case VoiceLabel.Home: return "房子";
            default: return "笑脸";
        }
    }

    /**
     * Send message to browser runtime (simulator or real)
     * 发送消息到浏览器运行时（模拟器或真实环境）
     */
    function sendSimMessage(type: string, data: string): void {
        const msg = {
            type: type,
            data: data,
            timestamp: control.millis()
        };
        
        try {
            const buf = Buffer.fromUTF8(JSON.stringify(msg));
            control.simmessages.send("voice-serial", buf);
        } catch (e) {
            console.log("[VoiceSerial] " + type + ": " + data);
        }
    }

    /**
     * Setup simulator message listener
     * 设置模拟器消息监听器
     */
    function setupSimListener(): void {
        if (_simEnabled) return;
        
        try {
            control.simmessages.onReceived("voice-serial", (buf: Buffer) => {
                try {
                    const msg = JSON.parse(buf.toString());
                    handleSimMessage(msg);
                } catch (e) {
                    console.log("Failed to parse message");
                }
            });
            _simEnabled = true;
        } catch (e) {
            // 非模拟器环境，忽略
        }
    }

    /**
     * Handle incoming messages from browser runtime
     * 处理来自浏览器运行时的消息
     */
    function handleSimMessage(msg: any): void {
        switch (msg.type) {
            case "keyword-detected":
                const keyword = msg.data;
                if (_keywordHandlers[keyword]) {
                    _keywordHandlers[keyword]();
                }
                break;
                
            case "serial-received":
                if (_serialDataHandler) {
                    _serialDataHandler(msg.data);
                }
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

    /**
     * Show corresponding icon on micro:bit LED matrix based on label
     * 根据标签在 micro:bit LED 点阵上显示对应图标
     */
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
