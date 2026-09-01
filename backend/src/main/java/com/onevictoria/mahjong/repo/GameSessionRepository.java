package com.onevictoria.mahjong.repo;
import com.onevictoria.mahjong.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface GameSessionRepository extends JpaRepository<GameSession, String> { List<GameSession> findByAccountIdOrderByUpdatedAtDesc(String accountId); Optional<GameSession> findByIdAndAccountId(String id, String accountId); }
