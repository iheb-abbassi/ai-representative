package com.ai.representative.controller;

import com.ai.representative.model.dto.AudioResponse;
import com.ai.representative.model.dto.HealthResponse;
import com.ai.representative.service.InterviewOrchestrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/interview")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewOrchestrationService orchestrationService;

    /**
     * Main endpoint for processing interview questions.
     * Accepts audio file, returns AI-generated audio response.
     *
     * @param audioFile The audio file containing the interviewer's question
     * @return AudioResponse with transcription, text response, and audio data
     */
    @PostMapping(value = "/speak", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> speak(
            @RequestParam("audio") MultipartFile audioFile) {

        log.info("Received /speak request, file: {}, size: {} bytes",
                audioFile.getOriginalFilename(), audioFile.getSize());

        try {
            AudioResponse response = orchestrationService.processInterviewQuestion(audioFile);

            // Build response map
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("transcription", response.getTranscription());
            responseBody.put("response", response.getResponse());

            // Return as JSON response with base64 encoded audio
            // This is simpler for frontend to handle
            String base64Audio = java.util.Base64.getEncoder().encodeToString(response.getAudioData());
            responseBody.put("audioData", base64Audio);
            responseBody.put("audioFormat", response.getAudioFormat());

            log.info("Successfully processed interview question");
            return ResponseEntity.ok(responseBody);

        } catch (Exception e) {
            log.error("Error processing interview question", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to process interview question: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Alternative endpoint that returns audio as downloadable file.
     *
     * @param audioFile The audio file containing the interviewer's question
     * @return Audio file response
     */
    @PostMapping(value = "/speak/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> speakAsAudio(
            @RequestParam("audio") MultipartFile audioFile) {

        log.info("Received /speak/audio request, file: {}, size: {} bytes",
                audioFile.getOriginalFilename(), audioFile.getSize());

        try {
            AudioResponse response = orchestrationService.processInterviewQuestion(audioFile);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(response.getAudioFormat()));
            headers.setContentLength(response.getAudioData().length);
            headers.setContentDispositionFormData("attachment", "ai-response.mp3");

            log.info("Successfully processed interview question as audio");
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(response.getAudioData());

        } catch (Exception e) {
            log.error("Error processing interview question", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Health check endpoint.
     *
     * @return Health status
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        HealthResponse response = HealthResponse.builder()
                .status("UP")
                .timestamp(timestamp)
                .version("1.0.0")
                .build();

        log.debug("Health check: {}", response.getStatus());
        return ResponseEntity.ok(response);
    }

    /**
     * Reset conversation endpoint.
     *
     * @return Success message
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset() {
        orchestrationService.resetConversation();

        Map<String, String> response = new HashMap<>();
        response.put("message", "Conversation reset successfully");

        log.info("Conversation reset");
        return ResponseEntity.ok(response);
    }

    /**
     * Get conversation history size.
     *
     * @return Conversation info
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        int historySize = orchestrationService.getHistorySize();

        Map<String, Object> response = new HashMap<>();
        response.put("conversationHistorySize", historySize);
        response.put("status", "UP");

        return ResponseEntity.ok(response);
    }

    /**
     * OPTIONS pre-flight handler for CORS.
     */
    @RequestMapping(value = "/**", method = RequestMethod.OPTIONS)
    public ResponseEntity<Void> handleOptions() {
        return ResponseEntity.ok().build();
    }
}
