// Test program for voice-serial extension
// 语音识别扩展测试程序

// ========== 测试 1: 基础设置 ==========

// 初始化语音识别（中文）
voiceSerial.initialize("zh-CN")

// 连接 micro:bit
voiceSerial.connectMicrobit()

// 设置置信度阈值为 0.6（较灵敏）
voiceSerial.setThreshold(0.6)

// ========== 测试 2: 关键词事件 ==========

// 关键词 1: 你好 → 笑脸
voiceSerial.onKeyword("你好", function () {
    voiceSerial.showLabel("笑脸")
})

// 关键词 2: 再见 → 哭脸
voiceSerial.onKeyword("再见", function () {
    voiceSerial.showLabel("哭脸")
})

// 关键词 3: 爱心 → 爱心图标
voiceSerial.onKeyword("爱心", function () {
    voiceSerial.showLabel("爱心")
})

// 关键词 4: 小狗 → 小狗图案
voiceSerial.onKeyword("小狗", function () {
    voiceSerial.showLabel("小狗")
})

// 关键词 5: 测试 → 发送自定义命令
voiceSerial.onKeyword("测试", function () {
    voiceSerial.sendCommand("TEST")
    basic.showNumber(123)
})

// ========== 测试 3: 串口数据接收 ==========

voiceSerial.onSerialDataReceived(function (data) {
    // 显示收到的数据首字母
    basic.showString(data.charAt(0))
})

// ========== 测试 4: 高级功能 ==========

// 当按钮 A 被按下时，显示最后发送的命令
input.onButtonPressed(Button.A, function () {
    const last = voiceSerial.lastCommand()
    basic.showString(last.charAt(0))
})

// 当按钮 B 被按下时，显示发送命令总数
input.onButtonPressed(Button.B, function () {
    const count = voiceSerial.commandsSent()
    basic.showNumber(count)
})

// 当 logo 被按下时，停止语音识别
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    voiceSerial.stopRecognition()
})

// ========== 测试 5: 循环检测状态 ==========

basic.forever(function () {
    // 每 5 秒检测一次连接状态
    basic.pause(5000)
    
    if (voiceSerial.isConnected()) {
        // 已连接，显示对勾
        basic.showIcon(IconNames.Yes)
        basic.pause(200)
        basic.clearScreen()
    } else {
        // 未连接，显示 X
        basic.showIcon(IconNames.No)
        basic.pause(200)
        basic.clearScreen()
    }
})
