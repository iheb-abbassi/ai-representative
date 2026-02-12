package com.ai.representative.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioResponse {

    private String transcription;
    private String response;
    private String audioFormat;
    private byte[] audioData;
}
