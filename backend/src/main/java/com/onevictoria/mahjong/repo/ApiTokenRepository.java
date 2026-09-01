package com.onevictoria.mahjong.repo;
import com.onevictoria.mahjong.model.ApiToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;
public interface ApiTokenRepository extends JpaRepository<ApiToken, String> {
    Optional<ApiToken> findByTokenHash(String hash);
    Optional<ApiToken> findByTokenHashAndExpiresAtAfter(String hash, Instant now);
}
