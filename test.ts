// 测试程序 - 使用简单字符串参数

// 基础设置
voiceSerial.initialize("zh-CN")
voiceSerial.connectMicrobit()

// 关键词事件 - 使用 showLabel 传入字符串
voiceSerial.onKeyword("你好", function () {
    voiceSerial.showLabel("笑脸")
})

voiceSerial.onKeyword("再见", function () {
    voiceSerial.showLabel("哭脸")
})

voiceSerial.onKeyword("小狗", function () {
    voiceSerial.showLabel("小狗")
})

// 串口数据接收
voiceSerial.onSerialDataReceived(function (data) {
    basic.showString(data.charAt(0))
})

// 按钮测试
input.onButtonPressed(Button.A, function () {
    voiceSerial.showLabel("爱心")
})

input.onButtonPressed(Button.B, function () {
    voiceSerial.sendCommand("TEST")
})
