package com.enterprise.aiplugin.filesystem

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import java.io.File

@Service
class FileSystemService {
    
    private val logger = Logger.getInstance(FileSystemService::class.java)
    
    init {
        logger.info("Enterprise AI Plugin file system service initialized")
    }
    
    fun createFile(path: String, content: String): String {
        try {
            val file = File(path)
            file.parentFile?.mkdirs()
            file.writeText(content)
            logger.info("Created file: $path")
            return "File created successfully: $path"
        } catch (e: Exception) {
            logger.error("Failed to create file: $path", e)
            throw e
        }
    }
    
    fun modifyFile(path: String, content: String): String {
        try {
            val file = File(path)
            if (!file.exists()) {
                throw IllegalArgumentException("File does not exist: $path")
            }
            file.writeText(content)
            logger.info("Modified file: $path")
            return "File modified successfully: $path"
        } catch (e: Exception) {
            logger.error("Failed to modify file: $path", e)
            throw e
        }
    }
    
    fun deleteFile(path: String): String {
        try {
            val file = File(path)
            if (!file.exists()) {
                throw IllegalArgumentException("File does not exist: $path")
            }
            val deleted = file.delete()
            if (deleted) {
                logger.info("Deleted file: $path")
                return "File deleted successfully: $path"
            } else {
                throw Exception("Failed to delete file: $path")
            }
        } catch (e: Exception) {
            logger.error("Failed to delete file: $path", e)
            throw e
        }
    }
    
    fun readFile(path: String): String {
        try {
            val file = File(path)
            if (!file.exists()) {
                throw IllegalArgumentException("File does not exist: $path")
            }
            val content = file.readText()
            logger.info("Read file: $path")
            return content
        } catch (e: Exception) {
            logger.error("Failed to read file: $path", e)
            throw e
        }
    }
    
    fun fileExists(path: String): Boolean {
        return File(path).exists()
    }
    
    fun getFileInfo(path: String): Map<String, Any> {
        val file = File(path)
        return mapOf(
            "exists" to file.exists(),
            "size" to (if (file.exists()) file.length() else 0L),
            "lastModified" to (if (file.exists()) file.lastModified() else 0L),
            "isDirectory" to (if (file.exists()) file.isDirectory else false)
        )
    }
}
