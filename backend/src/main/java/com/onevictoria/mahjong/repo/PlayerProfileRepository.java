package com.onevictoria.mahjong.repo;
import com.onevictoria.mahjong.model.PlayerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PlayerProfileRepository extends JpaRepository<PlayerProfile, String> { List<PlayerProfile> findByAccountIdOrderByCreatedAt(String accountId); Optional<PlayerProfile> findByIdAndAccountId(String id, String accountId); }
