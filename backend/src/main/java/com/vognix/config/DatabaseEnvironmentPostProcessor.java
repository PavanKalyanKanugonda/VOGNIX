package com.vognix.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.CommandLinePropertySource;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Automatically configures PostgreSQL (Neon / Vercel Postgres / standard PostgreSQL URIs)
 * whenever DATABASE_URL, POSTGRES_URL, or POSTGRES_JDBC_URL is provided in the environment,
 * without overriding explicit CLI/JVM datasource arguments, test in-memory H2 configs,
 * or explicit non-PostgreSQL profiles (such as mysql, h2, or test).
 */
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String PROPERTY_SOURCE_NAME = "vognix-database";
    private static final Set<String> NON_POSTGRES_PROFILES = Set.of("mysql", "h2", "h2-local", "test");
    private static final Set<String> DROPPED_QUERY_PARAMS = Set.of(
            "channel_binding", "pgbouncer", "supa", "connection_limit", "pool_timeout"
    );

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        MutablePropertySources propertySources = environment.getPropertySources();

        // 1. Respect explicit CLI (--spring.datasource.url=...) or JVM (-Dspring.datasource.url=...) overrides
        if (hasDirectProperty(propertySources, CommandLinePropertySource.COMMAND_LINE_PROPERTY_SOURCE_NAME, "spring.datasource.url")
                || hasDirectProperty(propertySources, StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, "spring.datasource.url")) {
            return;
        }

        // 2. Respect test / AppCDS in-memory H2 configurations
        String currentDatasourceUrl = environment.getProperty("spring.datasource.url");
        if (currentDatasourceUrl != null && currentDatasourceUrl.trim().toLowerCase(Locale.ROOT).startsWith("jdbc:h2:mem:")) {
            return;
        }

        // 3. Respect explicit mysql / h2 / test profiles
        if (hasExplicitNonPostgresProfile(environment, propertySources)) {
            return;
        }

        // 4. Find a PostgreSQL connection URL in the environment
        String rawPrimaryUrl = firstValidPostgresUrl(environment,
                "POSTGRES_JDBC_URL", "DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL");
        if (rawPrimaryUrl == null) {
            if (cleanValue(environment.getProperty("H2_DATASOURCE_URL")) == null
                    && currentDatasourceUrl != null
                    && currentDatasourceUrl.startsWith("jdbc:h2:file:./data/vognixdb")
                    && isRepoRootWorkingDirectory()) {
                Map<String, Object> fallbackProps = Map.of(
                        "spring.datasource.url",
                        currentDatasourceUrl.replace("jdbc:h2:file:./data/vognixdb", "jdbc:h2:file:./backend/data/vognixdb")
                );
                insertPropertySource(propertySources, new MapPropertySource(PROPERTY_SOURCE_NAME, fallbackProps));
            }
            return;
        }

        String fallbackUser = cleanValue(environment.getProperty("POSTGRES_USER"));
        String fallbackPassword = environment.getProperty("POSTGRES_PASSWORD");
        if (isPlaceholderOrBlank(fallbackPassword)) {
            fallbackPassword = null;
        }

        ParsedConnection primary = parsePostgresConnection(rawPrimaryUrl, fallbackUser, fallbackPassword);
        if (primary == null) {
            return;
        }

        Map<String, Object> dbProps = new LinkedHashMap<>();
        dbProps.put("spring.datasource.url", primary.jdbcUrl());
        dbProps.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
        if (primary.username() != null) {
            dbProps.put("spring.datasource.username", primary.username());
        }
        if (primary.password() != null) {
            dbProps.put("spring.datasource.password", primary.password());
        }

        dbProps.put("spring.jpa.hibernate.ddl-auto", "validate");
        dbProps.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");

        dbProps.put("spring.flyway.enabled", "true");
        dbProps.put("spring.flyway.baseline-on-migrate", "true");
        dbProps.put("spring.flyway.locations", "classpath:db/postgres");
        dbProps.put("spring.flyway.lock-retry-count", "60");

        // Serverless-friendly HikariCP defaults if not explicitly set
        putIfAbsentInEnvironment(environment, dbProps, "spring.datasource.hikari.maximum-pool-size", "5");
        putIfAbsentInEnvironment(environment, dbProps, "spring.datasource.hikari.minimum-idle", "0");
        putIfAbsentInEnvironment(environment, dbProps, "spring.datasource.hikari.connection-timeout", "30000");
        putIfAbsentInEnvironment(environment, dbProps, "spring.datasource.hikari.idle-timeout", "300000");
        putIfAbsentInEnvironment(environment, dbProps, "spring.datasource.hikari.max-lifetime", "1200000");
        putIfAbsentInEnvironment(environment, dbProps, "spring.datasource.hikari.keepalive-time", "30000");

        // Prefer unpooled/direct URL for Flyway advisory locks when provided (e.g. Neon + Vercel)
        String rawUnpooledUrl = firstValidPostgresUrl(environment,
                "POSTGRES_UNPOOLED_JDBC_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING");
        if (rawUnpooledUrl != null) {
            ParsedConnection unpooled = parsePostgresConnection(rawUnpooledUrl, fallbackUser, fallbackPassword);
            if (unpooled != null) {
                dbProps.put("spring.flyway.url", unpooled.jdbcUrl());
                if (unpooled.username() != null) {
                    dbProps.put("spring.flyway.user", unpooled.username());
                }
                if (unpooled.password() != null) {
                    dbProps.put("spring.flyway.password", unpooled.password());
                }
            }
        }

        insertPropertySource(propertySources, new MapPropertySource(PROPERTY_SOURCE_NAME, dbProps));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    protected boolean isRepoRootWorkingDirectory() {
        return Files.isRegularFile(Paths.get("backend", "pom.xml"))
                && Files.isDirectory(Paths.get("backend", "src"))
                && !Files.isRegularFile(Paths.get("pom.xml"));
    }

    static ParsedConnection parsePostgresConnection(String rawUrl, String fallbackUser, String fallbackPassword) {
        String trimmed = rawUrl.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("jdbc:postgresql://")) {
            return new ParsedConnection(trimmed, cleanValue(fallbackUser), fallbackPassword);
        }
        if (!lower.startsWith("postgresql://") && !lower.startsWith("postgres://")) {
            return null;
        }

        String normalized = lower.startsWith("postgres://")
                ? "postgresql://" + trimmed.substring("postgres://".length())
                : "postgresql://" + trimmed.substring("postgresql://".length());

        URI uri = URI.create(normalized);
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return null;
        }

        String username = cleanValue(fallbackUser);
        String password = fallbackPassword;
        String rawUserInfo = uri.getRawUserInfo();
        if (rawUserInfo != null && !rawUserInfo.isEmpty()) {
            int colonIdx = rawUserInfo.indexOf(':');
            if (colonIdx >= 0) {
                username = percentDecode(rawUserInfo.substring(0, colonIdx));
                password = percentDecode(rawUserInfo.substring(colonIdx + 1));
            } else {
                username = percentDecode(rawUserInfo);
            }
        }

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://");
        jdbcUrl.append(host);
        if (uri.getPort() > 0) {
            jdbcUrl.append(':').append(uri.getPort());
        }

        String rawPath = uri.getRawPath();
        if (rawPath != null && !rawPath.isEmpty()) {
            jdbcUrl.append(percentDecode(rawPath));
        }

        List<String> queryParams = new ArrayList<>();
        boolean hasSslMode = false;
        boolean hasPrepareThreshold = false;

        String rawQuery = uri.getRawQuery();
        if (rawQuery != null && !rawQuery.isBlank()) {
            for (String pair : rawQuery.split("&")) {
                if (pair.isBlank()) {
                    continue;
                }
                int eqIdx = pair.indexOf('=');
                String key = eqIdx >= 0 ? pair.substring(0, eqIdx) : pair;
                String lowerKey = key.toLowerCase(Locale.ROOT);
                if (DROPPED_QUERY_PARAMS.contains(lowerKey)) {
                    continue;
                }
                if ("sslmode".equals(lowerKey) || "ssl".equals(lowerKey)) {
                    hasSslMode = true;
                } else if ("preparethreshold".equals(lowerKey)) {
                    hasPrepareThreshold = true;
                }
                queryParams.add(pair);
            }
        }

        if (!hasSslMode && !isLocalHost(host)) {
            queryParams.add("sslmode=require");
        }
        if (host.toLowerCase(Locale.ROOT).contains("-pooler.") && !hasPrepareThreshold) {
            queryParams.add("prepareThreshold=0");
        }

        if (!queryParams.isEmpty()) {
            jdbcUrl.append('?').append(String.join("&", queryParams));
        }

        return new ParsedConnection(jdbcUrl.toString(), username, password);
    }

    private static boolean hasExplicitNonPostgresProfile(ConfigurableEnvironment environment, MutablePropertySources propertySources) {
        for (String active : environment.getActiveProfiles()) {
            if (NON_POSTGRES_PROFILES.contains(active.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        String[] profileKeys = {"spring.profiles.active", "SPRING_PROFILES_ACTIVE"};
        for (PropertySource<?> ps : propertySources) {
            for (String key : profileKeys) {
                Object val = ps.getProperty(key);
                if (val instanceof String strVal && !strVal.isBlank()) {
                    for (String token : strVal.split(",")) {
                        if (NON_POSTGRES_PROFILES.contains(token.trim().toLowerCase(Locale.ROOT))) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private static boolean hasDirectProperty(MutablePropertySources propertySources, String sourceName, String key) {
        PropertySource<?> source = propertySources.get(sourceName);
        if (source == null) {
            return false;
        }
        Object value = source.getProperty(key);
        return value != null && !value.toString().isBlank();
    }

    private static String firstValidPostgresUrl(ConfigurableEnvironment environment, String... keys) {
        for (String key : keys) {
            String value = cleanValue(environment.getProperty(key));
            if (value == null) {
                continue;
            }
            String lower = value.toLowerCase(Locale.ROOT);
            if (lower.startsWith("jdbc:postgresql://")
                    || lower.startsWith("postgresql://")
                    || lower.startsWith("postgres://")) {
                return value;
            }
        }
        return null;
    }

    private static void putIfAbsentInEnvironment(ConfigurableEnvironment environment,
                                                 Map<String, Object> target,
                                                 String key,
                                                 String defaultValue) {
        String existing = environment.getProperty(key);
        if (existing == null || existing.isBlank()) {
            target.put(key, defaultValue);
        }
    }

    private static void insertPropertySource(MutablePropertySources propertySources, MapPropertySource newSource) {
        propertySources.remove(PROPERTY_SOURCE_NAME);
        if (propertySources.contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
            propertySources.addAfter(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, newSource);
        } else if (propertySources.contains(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME)) {
            propertySources.addAfter(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, newSource);
        } else if (propertySources.contains(CommandLinePropertySource.COMMAND_LINE_PROPERTY_SOURCE_NAME)) {
            propertySources.addAfter(CommandLinePropertySource.COMMAND_LINE_PROPERTY_SOURCE_NAME, newSource);
        } else {
            propertySources.addFirst(newSource);
        }
    }

    private static boolean isLocalHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return "localhost".equals(normalized) || "127.0.0.1".equals(normalized) || "[::1]".equals(normalized);
    }

    private static String cleanValue(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty() || isPlaceholderOrBlank(trimmed)) {
            return null;
        }
        return trimmed;
    }

    private static boolean isPlaceholderOrBlank(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String lower = value.trim().toLowerCase(Locale.ROOT);
        return lower.startsWith("your_")
                || lower.startsWith("replace-with-")
                || lower.contains("changeme")
                || (lower.startsWith("${") && lower.endsWith("}"));
    }

    private static String percentDecode(String input) {
        if (input == null || input.indexOf('%') < 0) {
            return input;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream(input.length());
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c == '%' && i + 2 < input.length()) {
                int hi = Character.digit(input.charAt(i + 1), 16);
                int lo = Character.digit(input.charAt(i + 2), 16);
                if (hi >= 0 && lo >= 0) {
                    out.write((hi << 4) + lo);
                    i += 2;
                    continue;
                }
            }
            byte[] bytes = String.valueOf(c).getBytes(StandardCharsets.UTF_8);
            out.writeBytes(bytes);
        }
        return out.toString(StandardCharsets.UTF_8);
    }

    record ParsedConnection(String jdbcUrl, String username, String password) {}
}
