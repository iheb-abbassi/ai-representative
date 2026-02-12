package com.ai.representative.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Data
@Slf4j
@Configuration
public class OpenAIConfig {

    @Value("${openai.api-key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${openai.base-url:https://api.openai.com}")
    private String baseUrl;

    @Value("${openai.chat.model:gpt-4o}")
    private String chatModel;

    @Value("${openai.chat.temperature:0.7}")
    private Double temperature;

    @Value("${openai.chat.max-tokens:500}")
    private Integer maxTokens;

    @Value("${openai.tts.model:tts-1}")
    private String ttsModel;

    @Value("${openai.tts.voice:alloy}")
    private String ttsVoice;

    @Value("${openai.transcription.model:whisper-1}")
    private String transcriptionModel;

    @PostConstruct
    public void initializeApiKeyFallback() {
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            return;
        }

        List<Path> candidates = List.of(
                Path.of(".env"),
                Path.of("backend", ".env"),
                Path.of("..", ".env")
        );

        for (Path path : candidates) {
            String value = readKeyFromEnvFile(path);
            if (value != null && !value.trim().isEmpty()) {
                apiKey = value.trim();
                log.info("Loaded OPENAI_API_KEY from {}", path.toAbsolutePath().normalize());
                return;
            }
        }

        log.warn("OPENAI_API_KEY is not set in environment or local .env files.");
    }

    private String readKeyFromEnvFile(Path path) {
        if (!Files.exists(path)) {
            return null;
        }

        try {
            List<String> lines = Files.readAllLines(path);
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (trimmed.startsWith("OPENAI_API_KEY=")) {
                    return trimmed.substring("OPENAI_API_KEY=".length());
                }
            }
        } catch (IOException e) {
            log.debug("Failed reading {}", path.toAbsolutePath().normalize(), e);
        }

        return null;
    }
}
