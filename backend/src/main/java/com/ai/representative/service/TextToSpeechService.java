package com.ai.representative.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class TextToSpeechService {

    private final OpenAiApiClient apiClient;

    /**
     * Converts the given text to speech audio using OpenAI TTS API.
     */
    public byte[] synthesize(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text cannot be null or empty");
        }

        log.info("Synthesizing speech, chars: {}", text.length());

        try {
            byte[] audioData = apiClient.textToSpeech(text);

            log.info("Speech synthesis completed, audio size: {} bytes", audioData.length);
            return audioData;

        } catch (Exception e) {
            log.error("Error synthesizing speech", e);
            throw new RuntimeException("Failed to synthesize speech: " + e.getMessage(), e);
        }
    }

    /**
     * Returns the audio format of the synthesized speech.
     */
    public String getAudioFormat() {
        return "audio/mpeg";
    }
}
