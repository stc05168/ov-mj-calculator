package com.onevictoria.mahjong.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "api_token", indexes = @Index(name = "idx_token_hash", columnList = "token_hash", unique = true))
public class ApiToken {
    @Id public String id;
    @Column(name = "token_hash", nullable = false, length = 64) public String tokenHash;
    @Column(name = "account_id", nullable = false, length = 36) public String accountId;
    @Column(name = "expires_at", nullable = false) public Instant expiresAt;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
    protected ApiToken() {}
    public ApiToken(String id, String tokenHash, String accountId, Instant expiresAt, Instant createdAt) {
        this.id = id; this.tokenHash = tokenHash; this.accountId = accountId; this.expiresAt = expiresAt; this.createdAt = createdAt;
    }
}
