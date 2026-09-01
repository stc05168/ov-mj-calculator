package com.onevictoria.mahjong.service;

import com.onevictoria.mahjong.model.*;
import com.onevictoria.mahjong.repo.*;
import com.onevictoria.mahjong.web.ApiProblem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service
public class AuthService {
    private final AccountRepository accounts;
    private final ApiTokenRepository tokens;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private final SecureRandom random = new SecureRandom();
    private final long tokenDays;

    public AuthService(AccountRepository accounts, ApiTokenRepository tokens, @Value("${app.token-days:30}") long tokenDays) {
        this.accounts = accounts; this.tokens = tokens; this.tokenDays = tokenDays;
    }

    @Transactional
    public LoginResult register(String emailValue, String password, String displayNameValue) {
        String email = normalizeEmail(emailValue);
        String displayName = requireText(displayNameValue, "顯示名稱", 40);
        validatePassword(password);
        if (accounts.findByEmail(email).isPresent()) throw ApiProblem.conflict("此電郵已註冊");
        Account account = accounts.save(new Account(UUID.randomUUID().toString(), email, passwordEncoder.encode(password), displayName, Instant.now()));
        return issue(account);
    }

    @Transactional
    public LoginResult login(String emailValue, String password) {
        Account account = accounts.findByEmail(normalizeEmail(emailValue)).orElseThrow(ApiProblem::unauthorized);
        if (password == null || password.getBytes(StandardCharsets.UTF_8).length > 72 || !passwordEncoder.matches(password, account.passwordHash)) throw ApiProblem.unauthorized();
        return issue(account);
    }

    @Transactional(readOnly = true)
    public String authenticate(String rawToken) {
        if (rawToken == null || rawToken.length() < 32) throw ApiProblem.unauthorized();
        return tokens.findByTokenHashAndExpiresAtAfter(hash(rawToken), Instant.now()).map(token -> token.accountId).orElseThrow(ApiProblem::unauthorized);
    }

    @Transactional
    public void revoke(String rawToken) { tokens.findByTokenHash(hash(rawToken)).ifPresent(tokens::delete); }

    @Transactional(readOnly = true)
    public Account requireAccount(String id) { return accounts.findById(id).orElseThrow(ApiProblem::unauthorized); }

    private LoginResult issue(Account account) {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofDays(tokenDays));
        tokens.save(new ApiToken(UUID.randomUUID().toString(), hash(raw), account.id, expiresAt, now));
        return new LoginResult(raw, expiresAt, account.id, account.email, account.displayName);
    }

    private String normalizeEmail(String value) {
        String email = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw ApiProblem.badRequest("電郵格式無效");
        return email;
    }
    private void validatePassword(String value) {
        int bytes = value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length;
        if (value == null || value.length() < 8 || bytes > 72) throw ApiProblem.badRequest("密碼必須至少 8 個字元且 UTF-8 不可超過 72 bytes");
    }
    private String requireText(String value, String label, int max) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty() || text.length() > max) throw ApiProblem.badRequest(label + "不可空白且不可超過 " + max + " 字元");
        return text;
    }
    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte item : digest) result.append(String.format("%02x", item));
            return result.toString();
        } catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }

    public record LoginResult(String token, Instant expiresAt, String accountId, String email, String displayName) {}
}
