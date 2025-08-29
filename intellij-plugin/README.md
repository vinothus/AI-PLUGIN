# Enterprise AI Plugin for IntelliJ

An enterprise-grade AI coding assistant for IntelliJ IDEA with advanced security, compliance, and data protection features.

## Features

### 🤖 AI-Powered Code Assistance
- **Multi-Provider Support**: OpenAI, Anthropic, and custom AI providers
- **Context-Aware Suggestions**: Understands your project structure and current code
- **Code Generation**: Generate code snippets, functions, and complete files
- **Code Refactoring**: AI-powered code optimization and restructuring
- **Debugging Assistance**: Get help with error analysis and fixes

### 🔒 Enterprise Security
- **AES-256 Encryption**: All data encrypted at rest and in transit
- **Role-Based Access Control**: Fine-grained permissions and access management
- **Security Audit**: Comprehensive security scanning and reporting
- **Compliance Support**: GDPR, SOC2, HIPAA, and custom compliance modes
- **Command Validation**: Prevents execution of dangerous commands

### 📊 Advanced Features
- **Plan/Act Workflow**: Structured task planning and execution
- **Checkpoint System**: Shadow Git for version control and rollback
- **Context Management**: Intelligent project context extraction
- **File System Operations**: Secure file creation, modification, and management
- **Audit Logging**: Complete audit trail for compliance and security

## Installation

1. Download the plugin JAR file
2. Install in IntelliJ IDEA via Plugins panel
3. Configure your AI provider settings
4. Start using the AI assistant!

## Configuration

### AI Provider Setup

1. Go to **Tools** → **Enterprise AI Plugin** → **Configure AI Settings**
2. Enter your AI provider API keys
3. Configure server URL for custom providers
4. Save settings

### Security Settings

- **Encryption Level**: Standard, Enhanced, or Military-grade
- **Compliance Mode**: GDPR, SOC2, HIPAA, or Custom
- **Data Retention**: Configure data retention periods
- **Authentication**: SSO, API Key, or OAuth

## Usage

### Starting the AI Assistant

1. Go to **Tools** → **Enterprise AI Plugin** → **Start AI Assistant**
2. Or use the keyboard shortcut: `Ctrl+Alt+A`
3. The AI assistant tool window will open
4. Type your question or request
5. Get AI-powered assistance!

### File Operations

- **Create Files**: Ask AI to create new files with specific content
- **Modify Files**: Request code changes and improvements
- **Code Review**: Get AI-powered code review and suggestions

### Security Features

- **Security Audit**: Go to **Tools** → **Enterprise AI Plugin** → **Security Audit**
- **Access Control**: Manage user permissions and roles
- **Audit Logs**: View complete activity logs

## Architecture

The plugin is built with a modular architecture:

- **Application Services**: Core coordination and state management
- **AI Provider Service**: Multi-provider AI integration
- **Security Service**: Encryption, authentication, and compliance
- **Context Service**: Project context extraction and management
- **Tool Windows**: UI components for different features

## Development

### Prerequisites

- IntelliJ IDEA 2023.3+
- Kotlin 1.9.20+
- Java 17+
- Gradle 8.0+

### Building

```bash
./gradlew build
./gradlew buildPlugin
```

### Testing

```bash
./gradlew test
./gradlew runIdeForUi
```

### Running in Development

```bash
./gradlew runIde
```

## Security Considerations

- All API keys are stored securely using IntelliJ's secure storage
- File operations are validated for security and compliance
- Dangerous commands are blocked by default
- All data is encrypted using AES-256-GCM
- Audit logging captures all activities for compliance

## Compliance

The plugin supports various compliance frameworks:

- **GDPR**: Data protection and privacy compliance
- **SOC2**: Security and availability controls
- **HIPAA**: Healthcare data protection
- **Custom**: Configurable compliance requirements

## Project Structure

```
src/main/kotlin/com/enterprise/aiplugin/
├── AiPluginApplicationService.kt    # Main application service
├── actions/                         # Action classes
├── ai/                             # AI provider implementations
├── context/                        # Context management
├── security/                       # Security features
├── settings/                       # Configuration
├── ui/                            # User interface components
└── utils/                         # Utility classes
```

## Dependencies

- **Kotlin**: Language and coroutines
- **Spring Boot**: Enterprise features and dependency injection
- **OkHttp**: HTTP client for API calls
- **Bouncy Castle**: Cryptography
- **Jackson**: JSON processing
- **Micrometer**: Metrics and monitoring

## Support

For support and documentation, visit our documentation portal or contact the development team.

## License

Enterprise license - contact for pricing and terms.
