package com.onevictoria.mahjong.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_account", uniqueConstraints = @UniqueConstraint(name = "uk_account_email", columnNames = "email"))
public class Account {
    @Id public String id;
    @Column(nullable = false, length = 254) public String email;
    @Column(nullable = false, length = 60) public String passwordHash;
    @Column(nullable = false, length = 40) public String displayName;
    @Column(nullable = false) public Instant createdAt;
    protected Account() {}
    public Account(String id, String email, String passwordHash, String displayName, Instant createdAt) {
        this.id = id; this.email = email; this.passwordHash = passwordHash; this.displayName = displayName; this.createdAt = createdAt;
    }
}
