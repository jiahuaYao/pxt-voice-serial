// Test program for voice-serial extension

// Test 1: Basic setup
voiceSerial.initialize("zh-CN")
voiceSerial.connectMicrobit()

// Test 2: Keyword handlers
voiceSerial.onKeyword("你好", function () {
    voiceSerial.showEmoji("😊")
})

voiceSerial.onKeyword("爱心", function () {
    voiceSerial.showEmoji("❤️")
})

// Test 3: Custom command
voiceSerial.onKeyword("测试", function () {
    voiceSerial.sendCommand("TEST")
})

// Test 4: Serial feedback
voiceSerial.onSerialDataReceived(function (data) {
    basic.showString(data)
})