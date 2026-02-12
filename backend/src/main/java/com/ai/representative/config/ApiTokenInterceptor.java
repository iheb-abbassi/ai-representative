package com.ai.representative.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ApiTokenInterceptor implements HandlerInterceptor {

    @Value("${app.access-token:}")
    private String accessToken;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Always allow CORS preflight checks.
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        // Allow health checks without token.
        if (request.getRequestURI().endsWith("/health")) {
            return true;
        }

        // Dev mode: token auth disabled when no token configured.
        if (accessToken == null || accessToken.isBlank()) {
            return true;
        }

        String provided = request.getHeader("X-APP-TOKEN");
        if (provided == null || provided.isBlank()) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                provided = authHeader.substring("Bearer ".length()).trim();
            }
        }

        if (!accessToken.equals(provided)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Unauthorized\"}");
            return false;
        }

        return true;
    }
}
