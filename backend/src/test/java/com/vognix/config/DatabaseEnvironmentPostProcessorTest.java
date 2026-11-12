package com.vognix.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.CommandLinePropertySource;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.SimpleCommandLinePropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.mock.env.MockEnvironment;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DatabaseEnvironmentPostProcessorTest {

    private final DatabaseEnvironmentPostProcessor processor = new DatabaseEnvironmentPostProcessor();

    @Test
    void convertsNeonPooledAndUnpooledUrlsToJdbcAndFlywayProperties() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL",
                        "postgresql://neondb_owner:p%40ss%2Bword+123@ep-cool-rain-123456-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
                .withProperty("DATABASE_URL_UNPOOLED",
                        "postgresql://neondb_owner:p%40ss%2Bword+123@ep-cool-rain-123456.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
                .withProperty("SPRING_PROFILES_ACTIVE", "default");
        env.getPropertySources().addLast(new MapPropertySource("Config resource [application.properties]", Map.of(
                "spring.datasource.url", "jdbc:h2:file:/tmp/vognixdb;MODE=MySQL",
                "spring.datasource.driver-class-name", "org.h2.Driver",
                "spring.flyway.locations", "classpath:db/migration"
        )));

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals(
                "jdbc:postgresql://ep-cool-rain-123456-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&prepareThreshold=0",
                env.getProperty("spring.datasource.url")
        );
        assertEquals("neondb_owner", env.getProperty("spring.datasource.username"));
        assertEquals("p@ss+word+123", env.getProperty("spring.datasource.password"));
        assertEquals("org.postgresql.Driver", env.getProperty("spring.datasource.driver-class-name"));
        assertEquals("org.hibernate.dialect.PostgreSQLDialect", env.getProperty("spring.jpa.properties.hibernate.dialect"));
        assertEquals("classpath:db/postgres", env.getProperty("spring.flyway.locations"));
        assertEquals("5", env.getProperty("spring.datasource.hikari.maximum-pool-size"));
        assertEquals("0", env.getProperty("spring.datasource.hikari.minimum-idle"));

        assertEquals(
                "jdbc:postgresql://ep-cool-rain-123456.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
                env.getProperty("spring.flyway.url")
        );
        assertEquals("neondb_owner", env.getProperty("spring.flyway.user"));
        assertEquals("p@ss+word+123", env.getProperty("spring.flyway.password"));
    }

    @Test
    void respectsCommandLineDatasourceOverrideForAppCdsBuild() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgres://user:pass@db.example.com:5432/vognix");
        SimpleCommandLinePropertySource cmdLine = new SimpleCommandLinePropertySource(
                "--spring.datasource.url=jdbc:h2:mem:cds;MODE=MySQL;DATABASE_TO_LOWER=TRUE");
        env.getPropertySources().addFirst(cmdLine);

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals("jdbc:h2:mem:cds;MODE=MySQL;DATABASE_TO_LOWER=TRUE", env.getProperty("spring.datasource.url"));
        assertNull(env.getPropertySources().get(DatabaseEnvironmentPostProcessor.PROPERTY_SOURCE_NAME));
    }

    @Test
    void respectsInMemoryH2TestConfiguration() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgresql://user:pass@db.example.com/neondb")
                .withProperty("spring.datasource.url", "jdbc:h2:mem:vognixtestdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE");

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals("jdbc:h2:mem:vognixtestdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE", env.getProperty("spring.datasource.url"));
        assertNull(env.getPropertySources().get(DatabaseEnvironmentPostProcessor.PROPERTY_SOURCE_NAME));
    }

    @Test
    void respectsExplicitMysqlProfile() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgresql://user:pass@db.example.com/neondb");
        env.setActiveProfiles("mysql");

        processor.postProcessEnvironment(env, new SpringApplication());

        assertNull(env.getPropertySources().get(DatabaseEnvironmentPostProcessor.PROPERTY_SOURCE_NAME));
    }

    @Test
    void defaultsSslModeRequireForRemotePostgresAndSkipsForLocalhost() {
        DatabaseEnvironmentPostProcessor.ParsedConnection remote =
                DatabaseEnvironmentPostProcessor.parsePostgresConnection("postgres://u:p@db.neon.tech/vognix", null, null);
        assertNotNull(remote);
        assertEquals("jdbc:postgresql://db.neon.tech/vognix?sslmode=require", remote.jdbcUrl());

        DatabaseEnvironmentPostProcessor.ParsedConnection local =
                DatabaseEnvironmentPostProcessor.parsePostgresConnection("postgres://u:p@localhost:5432/vognix", null, null);
        assertNotNull(local);
        assertEquals("jdbc:postgresql://localhost:5432/vognix", local.jdbcUrl());
    }

    @Test
    void letsSystemEnvironmentHikariSettingWinOverDefaults() {
        MockEnvironment env = new MockEnvironment();
        env.getPropertySources().addFirst(new MapPropertySource(
                StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                Map.of(
                        "DATABASE_URL", "postgresql://u:p@ep-xyz.neon.tech/neondb",
                        "spring.datasource.hikari.maximum-pool-size", "12"
                )
        ));

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals("12", env.getProperty("spring.datasource.hikari.maximum-pool-size"));
        assertEquals("jdbc:postgresql://ep-xyz.neon.tech/neondb?sslmode=require", env.getProperty("spring.datasource.url"));
        assertNotNull(env.getPropertySources().get(CommandLinePropertySource.COMMAND_LINE_PROPERTY_SOURCE_NAME) == null
                ? env.getPropertySources().get(DatabaseEnvironmentPostProcessor.PROPERTY_SOURCE_NAME)
                : null);
    }

    @Test
    void anchorsRelativeH2FileUrlToBackendFolderWhenLaunchedFromRepoRoot() {
        MockEnvironment env = new MockEnvironment();
        env.getPropertySources().addLast(new MapPropertySource("Config resource [application.properties]", Map.of(
                "spring.datasource.url", "jdbc:h2:file:./data/vognixdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
        )));

        DatabaseEnvironmentPostProcessor repoRootProcessor = new DatabaseEnvironmentPostProcessor() {
            @Override
            protected boolean isRepoRootWorkingDirectory() {
                return true;
            }
        };

        repoRootProcessor.postProcessEnvironment(env, new SpringApplication());

        assertEquals(
                "jdbc:h2:file:./backend/data/vognixdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                env.getProperty("spring.datasource.url")
        );
    }

    @Test
    void overridesContainerH2EnvFallbackWhenDatabaseUrlIsConfigured() {
        MockEnvironment env = new MockEnvironment();
        env.getPropertySources().addFirst(new MapPropertySource(
                StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                Map.of(
                        "H2_DATASOURCE_URL", "jdbc:h2:file:/tmp/vognixdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                        "DATABASE_URL", "postgresql://neondb_owner:secret@ep-cool-rain-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
                )
        ));
        env.getPropertySources().addLast(new MapPropertySource("Config resource [application.properties]", Map.of(
                "spring.datasource.url", "jdbc:h2:file:/tmp/vognixdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
        )));

        processor.postProcessEnvironment(env, new SpringApplication());

        assertEquals(
                "jdbc:postgresql://ep-cool-rain-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&prepareThreshold=0",
                env.getProperty("spring.datasource.url")
        );
        assertEquals("org.postgresql.Driver", env.getProperty("spring.datasource.driver-class-name"));
        assertEquals("classpath:db/postgres", env.getProperty("spring.flyway.locations"));
    }
}
