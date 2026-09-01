package com.onevictoria.mahjong.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "player_profile", indexes = @Index(name = "idx_player_owner", columnList = "account_id"))
public class PlayerProfile {
    @Id public String id;
    @Column(name = "account_id", nullable = false, length = 36) public String accountId;
    @Column(nullable = false, length = 40) public String name;
    @Column(nullable = false, length = 16) public String color;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
    protected PlayerProfile() {}
    public PlayerProfile(String id, String accountId, String name, String color, Instant createdAt) {
        this.id = id; this.accountId = accountId; this.name = name; this.color = color; this.createdAt = createdAt;
    }
}
