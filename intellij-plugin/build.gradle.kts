import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.9.20"
    id("org.jetbrains.intellij") version "1.17.2"
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("com.github.johnrengelman.shadow") version "8.1.1"
    id("org.sonarqube") version "4.4.1.3373"
    id("jacoco") version "0.8.11"
    id("org.owasp.dependencycheck") version "8.4.3"
    id("com.adarshr.test-logger") version "3.2.0"
}

group = "com.enterprise.aiplugin"
version = "1.0.0"

repositories {
    mavenCentral()
    maven { url = uri("https://packages.jetbrains.team/maven/p/ij/intellij-dependencies") }
    maven { url = uri("https://plugins.gradle.org/m2/") }
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

intellij {
    version.set("2024.1")
    type.set("IC") // IntelliJ IDEA Community Edition
    plugins.set(listOf("java", "gradle", "maven", "git4idea", "terminal"))
    instrumentCode.set(true)
}

dependencies {
    // IntelliJ Platform
    intellijPlugins("org.jetbrains.intellij.plugins:java")
    intellijPlugins("org.jetbrains.intellij.plugins:gradle")
    intellijPlugins("org.jetbrains.intellij.plugins:maven")
    intellijPlugins("org.jetbrains.intellij.plugins:git4idea")
    intellijPlugins("org.jetbrains.intellij.plugins:terminal")

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.7.3")
    
    // Spring Framework for Enterprise Features
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    
    // Security & Encryption
    implementation("org.springframework.security:spring-security-oauth2-client")
    implementation("org.springframework.security:spring-security-oauth2-jose")
    implementation("io.jsonwebtoken:jjwt-api:0.12.3")
    implementation("io.jsonwebtoken:jjwt-impl:0.12.3")
    implementation("io.jsonwebtoken:jjwt-jackson:0.12.3")
    implementation("org.bouncycastle:bcprov-jdk18on:1.77")
    implementation("org.bouncycastle:bcpkix-jdk18on:1.77")
    implementation("org.springframework.security:spring-security-crypto")
    
    // Database & Persistence
    implementation("com.h2database:h2")
    implementation("org.postgresql:postgresql")
    implementation("org.hibernate:hibernate-core")
    implementation("org.hibernate:hibernate-validator")
    implementation("org.flywaydb:flyway-core")
    
    // HTTP Client & API
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.retrofit2:converter-jackson:2.9.0")
    implementation("com.squareup.retrofit2:adapter-rxjava3:2.9.0")
    
    // AI Providers
    implementation("com.google.ai.client.generativeai:generativeai:0.1.2")
    
    // JSON Processing
    implementation("com.google.code.gson:gson:2.10.1")
    
    // JSON Processing
    implementation("com.fasterxml.jackson.core:jackson-databind")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.google.code.gson:gson:2.10.1")
    
    // WebSocket for MCP
    implementation("javax.websocket:javax.websocket-api:1.1")
    implementation("org.glassfish.tyrus:tyrus-client:2.1.1")
    implementation("org.glassfish.tyrus:tyrus-container-grizzly-client:2.1.1")
    
    // Logging & Monitoring
    implementation("org.slf4j:slf4j-api")
    implementation("ch.qos.logback:logback-classic")
    implementation("io.micrometer:micrometer-core")
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.micrometer:micrometer-registry-jmx")
    
    // Utilities
    implementation("org.apache.commons:commons-lang3:3.14.0")
    implementation("commons-io:commons-io:2.15.1")
    implementation("com.google.guava:guava:32.1.3-jre")
    implementation("org.apache.commons:commons-text:1.11.0")
    implementation("org.apache.commons:commons-configuration2:2.10.1")
    
    // YAML Configuration
    implementation("org.yaml:snakeyaml:2.2")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml")
    
    // MCP (Model Context Protocol)
    implementation("com.fasterxml.jackson.core:jackson-core")
    implementation("com.fasterxml.jackson.core:jackson-annotations")
    
    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.junit.jupiter:junit-jupiter-api")
    testImplementation("org.junit.jupiter:junit-jupiter-engine")
    testImplementation("org.mockito:mockito-core")
    testImplementation("org.mockito:mockito-junit-jupiter")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.2.1")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:testcontainers")
    testImplementation("io.mockk:mockk:1.13.8")
    testImplementation("org.jetbrains.kotlin:kotlin-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-Xjsr305=strict",
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi"
        )
    }
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf(
        "-Xlint:unchecked",
        "-Xlint:deprecation",
        "-Werror"
    ))
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
    }
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(false)
    }
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.8".toBigDecimal()
            }
        }
        rule {
            limit {
                counter = "BRANCH"
                value = "COVEREDRATIO"
                minimum = "0.7".toBigDecimal()
            }
        }
    }
}

sonarqube {
    properties {
        property("sonar.projectKey", "enterprise-cline-intellij")
        property("sonar.organization", "enterprise-cline")
        property("sonar.host.url", "https://sonarcloud.io")
        property("sonar.java.source", "17")
        property("sonar.kotlin.version", "1.9.20")
        property("sonar.coverage.jacoco.xmlReportPaths", "${buildDir}/reports/jacoco/test/jacocoTestReport.xml")
        property("sonar.sources", "src/main/kotlin,src/main/java")
        property("sonar.tests", "src/test/kotlin,src/test/java")
    }
}

shadowJar {
    archiveClassifier.set("shadow")
    mergeServiceFiles()
    exclude("META-INF/*.DSA")
    exclude("META-INF/*.RSA")
    exclude("META-INF/*.SF")
    exclude("META-INF/maven/**")
    exclude("META-INF/versions/**")
}

// Plugin packaging
patchPluginXml {
    sinceBuild.set("231")
    untilBuild.set("243.*")
    changeNotes.set("""
        <h3>Enterprise Cline Plugin v1.0.0</h3>
        <ul>
            <li>Initial release with enterprise security features</li>
            <li>SSO integration support (OAuth2/OIDC/SAML)</li>
            <li>Data encryption and compliance features</li>
            <li>Custom plugin framework with MCP support</li>
            <li>Audit logging and monitoring</li>
            <li>Policy-based access control</li>
            <li>Multi-provider LLM support</li>
            <li>Terminal integration with approval gates</li>
        </ul>
    """.trimIndent())
}

// Security scanning
dependencyCheck {
    failBuildOnCVSS = 7.0
    formats = listOf("HTML", "JSON", "SARIF")
    suppressionFile = file("config/dependency-check-suppressions.xml")
}

// Custom tasks
tasks.register("securityScan") {
    dependsOn("dependencyCheckAnalyze")
    doLast {
        println("Security scan completed. Check reports in build/reports/dependency-check/")
    }
}

tasks.register("complianceReport", JavaExec::class) {
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.enterprise.cline.compliance.ComplianceReporter")
    args("--output", "${buildDir}/reports/compliance")
}

tasks.register("generateDocumentation") {
    doLast {
        println("Generating documentation...")
        // Add documentation generation logic here
    }
}

// Build lifecycle
tasks.build {
    dependsOn("test", "jacocoTestReport", "dependencyCheckAnalyze")
}

tasks.assemble {
    dependsOn("shadowJar")
}

// Performance optimization
tasks.withType<Test> {
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).takeIf { it > 0 } ?: 1
    forkEvery = 100
}

// Memory settings for tests
tasks.withType<Test> {
    minHeapSize = "512m"
    maxHeapSize = "2g"
    jvmArgs = listOf(
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=200",
        "-XX:+UnlockExperimentalVMOptions",
        "-XX:+UseZGC"
    )
}
