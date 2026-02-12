package com.ai.representative.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS}")
    private String allowedMethods;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // Parse allowed origins from comma-separated list
        String[] origins = allowedOrigins.split(",");
        boolean hasWildcard = false;

        for (String origin : origins) {
            String trimmed = origin.trim();
            if (trimmed.contains("*")) {
                config.addAllowedOriginPattern(trimmed);
                hasWildcard = true;
            } else {
                config.addAllowedOrigin(trimmed);
            }
        }

        config.setAllowedMethods(Arrays.asList(allowedMethods.split(",")));
        config.addAllowedHeader("*");

        // Only allow credentials for specific origins (not wildcards)
        if (!hasWildcard) {
            config.setAllowCredentials(true);
        }

        config.setMaxAge(3600L);

        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
