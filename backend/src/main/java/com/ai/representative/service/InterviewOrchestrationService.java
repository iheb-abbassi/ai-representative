package com.ai.representative.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.ai.representative.model.dto.AudioResponse;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewOrchestrationService {

    private final AudioTranscriptionService transcriptionService;
    private final ConversationService conversationService;
    private final TextToSpeechService textToSpeechService;

    /**
     * Processes an interview question through the full pipeline:
     * 1. Transcribe audio to text
     * 2. Generate AI response using conversation context
     * 3. Convert response to speech
     *
     * @param audioFile The audio file containing the interviewer's question
     * @return AudioResponse containing transcription, response text, and audio data
     */
    public AudioResponse processInterviewQuestion(MultipartFile audioFile) {
        log.info("Processing interview question from audio file: {}",
                audioFile.getOriginalFilename());

        try {
            // Step 1: Transcribe audio
            String transcription = transcriptionService.transcribe(audioFile);
            log.info("Transcription completed, chars: {}", transcription == null ? 0 : transcription.length());

            // Step 2: Generate AI response
            String aiResponse = conversationService.generateResponseWithContext(transcription);
            log.info("AI response generated, chars: {}", aiResponse == null ? 0 : aiResponse.length());

            // Step 3: Convert to speech
            byte[] audioData = textToSpeechService.synthesize(aiResponse);
            String audioFormat = textToSpeechService.getAudioFormat();
            log.info("Audio synthesis complete, size: {} bytes", audioData.length);

            // Build response
            return AudioResponse.builder()
                    .transcription(transcription)
                    .response(aiResponse)
                    .audioFormat(audioFormat)
                    .audioData(audioData)
                    .build();

        } catch (Exception e) {
            log.error("Error processing interview question", e);
            throw new RuntimeException("Failed to process interview question: " + e.getMessage(), e);
        }
    }

    /**
     * Processes a text-based interview question (no audio transcription needed).
     *
     * @param question The selected question text
     * @return AudioResponse with the AI response and generated audio
     */
    public AudioResponse processTextQuestion(String question) {
        log.info("Processing text interview question, chars: {}", question == null ? 0 : question.length());

        try {
            // Generate AI response directly from text (skip transcription)
            String aiResponse = conversationService.generateResponseWithContext(question);
            log.info("AI response generated, chars: {}", aiResponse == null ? 0 : aiResponse.length());

            // Convert to speech
            byte[] audioData = textToSpeechService.synthesize(aiResponse);
            String audioFormat = textToSpeechService.getAudioFormat();
            log.info("Audio synthesis complete, size: {} bytes", audioData.length);

            // Build response
            return AudioResponse.builder()
                    .transcription(question)  // Echo the question
                    .response(aiResponse)
                    .audioFormat(audioFormat)
                    .audioData(audioData)
                    .build();
        } catch (Exception e) {
            log.error("Error processing text question: {}", question);
            throw new RuntimeException("Failed to process text question: " + e.getMessage(), e);
        }
    }

    /**
     * Resets the conversation context.
     */
    public void resetConversation() {
        conversationService.resetConversation();
        log.info("Interview conversation reset");
    }

    /**
     * Returns the current conversation history size.
     *
     * @return Number of message pairs in history
     */
    public int getHistorySize() {
        return conversationService.getHistorySize();
    }

    /**
     * Gets the list of common interview questions.
     *
     * @return List of interview questions
     */
    public List<String> getCommonInterviewQuestions() {
        return conversationService.getCommonInterviewQuestions();
    }
}
