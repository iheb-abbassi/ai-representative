package com.ai.representative.service;

import com.ai.representative.config.OpenAIConfig;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiApiClient {

    private final OpenAIConfig config;
    private final OkHttpClient httpClient = new OkHttpClient();
    private final Gson gson = new Gson();

    /**
     * Validates that API key is configured
     */
    private void validateApiKey() {
        if (config.getApiKey() == null || config.getApiKey().trim().isEmpty()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured. Please set it in .env file or environment variable.");
        }
    }

    /**
     * Sends a request to the OpenAI API
     */
    private String sendRequest(String endpoint, String requestBody) throws IOException {
        RequestBody body = RequestBody.create(
                requestBody,
                MediaType.parse("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(config.getBaseUrl() + endpoint)
                .addHeader("Authorization", "Bearer " + config.getApiKey())
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("HTTP " + response.code() + ": " + response.body().string());
            }
            return response.body().string();
        }
    }

    /**
     * Transcribes audio using Whisper API
     */
    public String transcribe(byte[] audioData, String filename) throws IOException {
        validateApiKey();
        MultipartBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", filename,
                        RequestBody.create(audioData,
                                MediaType.parse("audio/webm")))
                .addFormDataPart("model", config.getTranscriptionModel())
                .build();

        Request request = new Request.Builder()
                .url(config.getBaseUrl() + "/v1/audio/transcriptions")
                .addHeader("Authorization", "Bearer " + config.getApiKey())
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "Unknown error";
                throw new IOException("Transcription failed: " + response.code() + " - " + errorBody);
            }

            String responseBody = response.body().string();
            JsonObject json = gson.fromJson(responseBody, JsonObject.class);
            return json.get("text").getAsString();
        }
    }

    /**
     * Generates chat completion using GPT-4o
     */
    public String chatCompletion(String systemPrompt, String userMessage, String conversationHistory) throws IOException {
        validateApiKey();
        JsonObject requestBody = new JsonObject();

        // Add messages
        com.google.gson.JsonArray messages = new com.google.gson.JsonArray();

        // Add system message
        JsonObject systemMsg = new JsonObject();
        systemMsg.addProperty("role", "system");
        systemMsg.addProperty("content", systemPrompt);
        messages.add(systemMsg);

        // Add conversation history if provided (JSON array)
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            com.google.gson.JsonArray history = gson.fromJson(conversationHistory, com.google.gson.JsonArray.class);
            for (int i = 0; i < history.size(); i++) {
                messages.add(history.get(i));
            }
        }

        // Add user message
        JsonObject userMsg = new JsonObject();
        userMsg.addProperty("role", "user");
        userMsg.addProperty("content", userMessage);
        messages.add(userMsg);

        requestBody.add("messages", messages);
        requestBody.addProperty("model", config.getChatModel());
        requestBody.addProperty("temperature", config.getTemperature());
        requestBody.addProperty("max_tokens", config.getMaxTokens());

        String response = sendRequest("/v1/chat/completions", gson.toJson(requestBody));

        JsonObject jsonResponse = gson.fromJson(response, JsonObject.class);
        return jsonResponse.getAsJsonArray("choices")
                .get(0).getAsJsonObject()
                .get("message").getAsJsonObject()
                .get("content").getAsString();
    }

    /**
     * Generates text-to-speech audio
     */
    public byte[] textToSpeech(String text) throws IOException {
        validateApiKey();
        JsonObject requestBody = new JsonObject();
        requestBody.addProperty("model", config.getTtsModel());
        requestBody.addProperty("input", text);
        requestBody.addProperty("voice", config.getTtsVoice());
        requestBody.addProperty("response_format", "mp3");

        RequestBody body = RequestBody.create(
                gson.toJson(requestBody),
                MediaType.parse("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(config.getBaseUrl() + "/v1/audio/speech")
                .addHeader("Authorization", "Bearer " + config.getApiKey())
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "Unknown error";
                throw new IOException("TTS failed: " + response.code() + " - " + errorBody);
            }

            return response.body().bytes();
        }
    }

    /**
     * Gets conversation history as JSON string for chat completion
     */
    public String formatConversationHistory(java.util.List<com.ai.representative.model.ConversationMessage> history) {
        if (history == null || history.isEmpty()) {
            return "[]";
        }
        return gson.toJson(history);
    }
}
