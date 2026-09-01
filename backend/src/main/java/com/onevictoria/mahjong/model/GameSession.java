package com.onevictoria.mahjong.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "game_session", indexes = @Index(name = "idx_session_owner_updated", columnList = "account_id,updated_at"))
public class GameSession {
    @Id public String id;
    @Column(name = "account_id", nullable = false, length = 36) public String accountId;
    @Column(nullable = false, length = 80) public String title;
    @Column(name = "schema_version", nullable = false, length = 40) public String schemaVersion;
    @Lob @Column(nullable = false) public String payload;
    @Version public Long version;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
    @Column(name = "updated_at", nullable = false) public Instant updatedAt;
    protected GameSession() {}
    public GameSession(String id, String accountId, String title, String schemaVersion, String payload, Instant now) {
        this.id = id; this.accountId = accountId; this.title = title; this.schemaVersion = schemaVersion; this.payload = payload; this.createdAt = now; this.updatedAt = now;
    }
}
