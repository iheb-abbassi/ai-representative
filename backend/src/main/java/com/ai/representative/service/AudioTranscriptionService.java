package com.ai.representative.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioTranscriptionService {

    private final OpenAiApiClient apiClient;

    @Value("${audio.supported-formats}")
    private String supportedFormats;

    @Value("${audio.max-size-bytes:26214400}")
    private long maxSizeBytes;

    /**
     * Transcribes audio file to text using OpenAI Whisper API.
     */
    public String transcribe(MultipartFile audioFile) throws IOException {
        validateAudioFile(audioFile);

        log.info("Transcribing audio file: {}, size: {} bytes",
                audioFile.getOriginalFilename(), audioFile.getSize());

        try {
            String transcription = apiClient.transcribe(
                    audioFile.getBytes(),
                    audioFile.getOriginalFilename()
            );

            log.info("Transcription completed: {}", transcription);
            return transcription;
        } catch (Exception e) {
            log.error("Error transcribing audio", e);
            throw new RuntimeException("Failed to transcribe audio: " + e.getMessage(), e);
        }
    }

    /**
     * Validates the audio file format and size.
     */
    private void validateAudioFile(MultipartFile audioFile) {
        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("Audio file is required and cannot be empty");
        }

        String contentType = audioFile.getContentType();
        if (contentType == null || !supportedFormats.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Unsupported audio format: " + contentType + ". Supported formats: " + supportedFormats);
        }

        if (audioFile.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException(
                    "Audio file size exceeds maximum allowed size of " + (maxSizeBytes / 1024 / 1024) + "MB");
        }
    }
}
