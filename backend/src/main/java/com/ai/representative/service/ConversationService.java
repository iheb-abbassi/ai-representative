package com.ai.representative.service;

import com.ai.representative.model.ConversationMessage;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final OpenAiApiClient apiClient;

    private static final String SYSTEM_PROMPT_PATH = "prompts/job-candidate-system-prompt.txt";
    private static final String QUESTIONS_PATH = "prompts/common-interview-questions.txt";
    private final Map<String, List<ConversationMessage>> conversationHistoryBySession = new ConcurrentHashMap<>();

    /**
     * Generates an AI response based on the user's input using the job candidate persona.
     * This method does NOT use conversation history.
     */
    public String generateResponse(String userInput) {
        try {
            String systemPrompt = loadSystemPrompt();
            String historyJson = apiClient.formatConversationHistory(new ArrayList<>());

            String response = apiClient.chatCompletion(systemPrompt, userInput, historyJson);

            log.info("Generated AI response, chars: {}", response == null ? 0 : response.length());
            return response;

        } catch (Exception e) {
            log.error("Error generating conversation response", e);
            throw new RuntimeException("Failed to generate response: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a response with conversation history context.
     */
    public String generateResponseWithContext(String userInput) {
        try {
            String systemPrompt = loadSystemPrompt();
            String sessionId = getCurrentSessionId();
            List<ConversationMessage> history = getOrCreateHistory(sessionId);

            String response;
            synchronized (history) {
                // Add current exchange to history
                history.add(new ConversationMessage("user", userInput));

                // Generate response with a safe snapshot of history
                String historyJson = apiClient.formatConversationHistory(new ArrayList<>(history));
                response = apiClient.chatCompletion(systemPrompt, userInput, historyJson);

                // Add AI response to history
                history.add(new ConversationMessage("assistant", response));

                // Keep last 10 exchanges to avoid token limits
                while (history.size() > 20) {
                    history.subList(0, 2).clear();
                }
            }

            log.info("Generated AI response with context, chars: {}, session: {}",
                    response == null ? 0 : response.length(), sessionId);
            return response;

        } catch (Exception e) {
            log.error("Error generating conversation response with context", e);
            throw new RuntimeException("Failed to generate response: " + e.getMessage(), e);
        }
    }

    /**
     * Load common interview questions for the question picker.
     * Returns list of questions as a single string with newlines.
     */
    public List<String> getCommonInterviewQuestions() {
        try {
            ClassPathResource resource = new ClassPathResource(QUESTIONS_PATH);
            List<String> questions = new ArrayList<>();

            String content;
            try (InputStream inputStream = resource.getInputStream()) {
                content = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            }
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

    /**
     * Resets the conversation history.
     */
    public void resetConversation() {
        String sessionId = getCurrentSessionId();
        conversationHistoryBySession.remove(sessionId);
        log.info("Conversation history reset for session: {}", sessionId);
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
        String sessionId = getCurrentSessionId();
        List<ConversationMessage> history = conversationHistoryBySession.get(sessionId);
        if (history == null) {
            return 0;
        }
        synchronized (history) {
            return history.size() / 2;
        }
    }

    private List<ConversationMessage> getOrCreateHistory(String sessionId) {
        return conversationHistoryBySession.computeIfAbsent(
                sessionId,
                key -> Collections.synchronizedList(new ArrayList<>())
        );
    }

    private String getCurrentSessionId() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "no-request-context";
        }
        HttpServletRequest request = attrs.getRequest();
        if (request == null) {
            return "no-request";
        }
        return request.getSession(true).getId();
    }
}
