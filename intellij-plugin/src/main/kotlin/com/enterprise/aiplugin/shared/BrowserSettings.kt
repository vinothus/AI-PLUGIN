package com.enterprise.aiplugin.shared

data class BrowserSettings(
    val enabled: Boolean = false,
    val useLocalChrome: Boolean = false,
    val customArguments: List<String> = emptyList(),
    val headless: Boolean = true,
    val viewport: Viewport = Viewport(),
    val timeout: Int = 30000,
    val screenshotPath: String = "./screenshots"
)

data class Viewport(
    val width: Int = 1280,
    val height: Int = 720
)
