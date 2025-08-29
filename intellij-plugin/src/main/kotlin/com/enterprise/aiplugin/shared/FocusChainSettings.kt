package com.enterprise.aiplugin.shared

data class FocusChainSettings(
    val enabled: Boolean = false,
    val remindInterval: Int = 6,
    val autoUpdate: Boolean = true,
    val persistAcrossSessions: Boolean = true
)
