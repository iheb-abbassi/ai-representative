package com.ai.representative.model.dto;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AudioRequest {

    @NotNull(message = "Audio file is required")
    private MultipartFile audio;
}
