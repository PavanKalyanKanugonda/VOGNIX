package com.vognix.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class DotenvEnvironmentPostProcessorTest {

    @Test
    void loadsEnvAndFallsBackToNonPlaceholderExampleKeys(@TempDir Path tempDir) throws Exception {
        Path example = tempDir.resolve(".env.example");
        Files.writeString(example, """
                # Template
                RAZORPAY_API_KEY=rzp_test_example123
                RAZORPAY_SECRET_KEY=secret_example_456
                RAZORPAY_WEBHOOK_SECRET=your_webhook_signing_secret
                JWT_SECRET=replace-with-256-bit-hex-secret
                """);

        Path envFile = tempDir.resolve(".env");
        Files.writeString(envFile, """
                RAZORPAY_API_KEY="rzp_test_override999"
                """);

        String previousDir = System.getProperty("user.dir");
        // Verify parsing behavior by loading directly through helper subclass or MockEnvironment
        MockEnvironment env = new MockEnvironment();
        DotenvEnvironmentPostProcessor processor = new DotenvEnvironmentPostProcessor() {
            @Override
            protected java.util.List<Path> candidatePaths(String filename) {
                return java.util.List.of(tempDir.resolve(filename));
            }
        };

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals("rzp_test_override999", env.getProperty("RAZORPAY_API_KEY"));
        assertEquals("secret_example_456", env.getProperty("RAZORPAY_SECRET_KEY"));
        assertNull(env.getProperty("RAZORPAY_WEBHOOK_SECRET"));
        assertNull(env.getProperty("JWT_SECRET"));
        assertEquals(previousDir, System.getProperty("user.dir"));
    }
}
