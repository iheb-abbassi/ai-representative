package com.ai.representative.service;

import com.ai.representative.model.ConversationMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final OpenAiApiClient apiClient;

    private static final String SYSTEM_PROMPT_PATH = "prompts/job-candidate-system-prompt.txt";
    private static final String QUESTIONS_PATH = "prompts/common-interview-questions.txt";
    private final List<ConversationMessage> conversationHistory = new ArrayList<>();

    /**
     * Generates an AI response based on the user's input using the job candidate persona.
     */
    public String generateResponse(String userInput) {
        try {
            String systemPrompt = loadSystemPrompt();
            String historyJson = apiClient.formatConversationHistory(conversationHistory);

            String response = apiClient.chatCompletion(systemPrompt, userInput, historyJson);

            log.info("Generated AI response: {}", response);
            return response;

        } catch (Exception e) {
            log.error("Error generating conversation response", e);
            throw new RuntimeException("Failed to generate response: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a response with conversation history context.
     */
    public String generateResponse(String userInput) {
        return generateResponseWithContext(userInput);
    }

    /**
     * Load common interview questions for the question picker.
     * Returns list of questions as a single string with newlines.
     */
    public List<String> getCommonInterviewQuestions() {
        try {
            ClassPathResource resource = new ClassPathResource(QUESTIONS_PATH);
            InputStream inputStream = resource.getInputStream();
            List<String> questions = new ArrayList<>();

            // Read all lines as questions
            byte[] buffer = new byte[inputStream.available()];
            inputStream.read(buffer);
            inputStream.close();

            // Convert to string and split by newline
            String content = new String(buffer, StandardCharsets.UTF_8);
            String[] lines = content.split("\\r?\\n");

            // Add all non-empty lines as questions
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty()) {
                    questions.add(trimmed);
                }
            }

            log.info("Loaded {} interview questions", questions.size());
            return questions;
        } catch (IOException e) {
            log.error("Error loading interview questions", e);
            return new ArrayList<>();
        }
    }
        try {
            String systemPrompt = loadSystemPrompt();

            // Add current exchange to history
            conversationHistory.add(new ConversationMessage("user", userInput));

            // Generate response with history
            String historyJson = apiClient.formatConversationHistory(conversationHistory);
            String response = apiClient.chatCompletion(systemPrompt, userInput, historyJson);

            // Add AI response to history
            conversationHistory.add(new ConversationMessage("assistant", response));

            // Keep last 10 exchanges to avoid token limits
            if (conversationHistory.size() > 20) {
                conversationHistory.subList(0, 2).clear();
            }

            log.info("Generated AI response with context: {}", response);
            return response;

        } catch (Exception e) {
            log.error("Error generating conversation response with context", e);
            throw new RuntimeException("Failed to generate response: " + e.getMessage(), e);
        }
    }

    /**
     * Resets the conversation history.
     */
    public void resetConversation() {
        conversationHistory.clear();
        log.info("Conversation history reset");
    }

    /**
     * Loads the system prompt from the classpath resource.
     */
    private String loadSystemPrompt() throws IOException {
        ClassPathResource resource = new ClassPathResource(SYSTEM_PROMPT_PATH);
        return resource.getContentAsString(StandardCharsets.UTF_8);
    }

    /**
     * Returns the current conversation history size.
     */
    public int getHistorySize() {
        return conversationHistory.size() / 2;
    }
}
