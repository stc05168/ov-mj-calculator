package com.onevictoria.mahjong.web;

import com.onevictoria.mahjong.service.AuthService;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final AuthService auth;
    public AuthInterceptor(AuthService auth) { this.auth = auth; }
    @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equals(request.getMethod())) return true;
        String path = request.getRequestURI();
        if (path.equals("/api/health") || path.equals("/api/auth/register") || path.equals("/api/auth/login")) return true;
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) throw ApiProblem.unauthorized();
        request.setAttribute("accountId", auth.authenticate(header.substring(7).trim()));
        return true;
    }
}
