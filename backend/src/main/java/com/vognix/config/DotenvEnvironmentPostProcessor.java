package com.vognix.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Loads environment variables from a local .env file (with fallback to .env.example
 * for non-placeholder keys) without overriding OS environment variables, JVM system
 * properties, or profile/test application.properties overrides.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "vognix-dotenv";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> loaded = new LinkedHashMap<>();

        // 1. Load fallback values from .env.example (skipping template placeholders)
        for (Path candidate : candidatePaths(".env.example")) {
            if (Files.isRegularFile(candidate)) {
                parseFile(candidate, loaded, true);
                break;
            }
        }

        // 2. Load primary overrides from .env (takes precedence over .env.example)
        for (Path candidate : candidatePaths(".env")) {
            if (Files.isRegularFile(candidate)) {
                parseFile(candidate, loaded, false);
                break;
            }
        }

        if (!loaded.isEmpty()) {
            environment.getPropertySources().addLast(new MapPropertySource(PROPERTY_SOURCE_NAME, loaded));
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    protected List<Path> candidatePaths(String filename) {
        Path cwd = Paths.get("").toAbsolutePath().normalize();
        Path parent = cwd.getParent();
        if (parent != null) {
            return List.of(cwd.resolve(filename), parent.resolve(filename));
        }
        return List.of(cwd.resolve(filename));
    }

    private void parseFile(Path path, Map<String, Object> target, boolean ignorePlaceholders) {
        try {
            List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                if (line.startsWith("export ")) {
                    line = line.substring(7).trim();
                }
                int eqIdx = line.indexOf('=');
                if (eqIdx <= 0) {
                    continue;
                }
                String key = line.substring(0, eqIdx).trim();
                String value = unquote(line.substring(eqIdx + 1).trim());
                if (key.isEmpty() || value.isEmpty()) {
                    continue;
                }
                if (ignorePlaceholders && isPlaceholder(value)) {
                    continue;
                }
                target.put(key, value);
            }
        } catch (IOException ignored) {
            // Ignore unreadable optional dotenv files
        }
    }

    private String unquote(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }

    private boolean isPlaceholder(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("your_") || lower.startsWith("replace-with-") || lower.contains("changeme");
    }
}
