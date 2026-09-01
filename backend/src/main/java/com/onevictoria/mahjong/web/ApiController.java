package com.onevictoria.mahjong.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.onevictoria.mahjong.model.*;
import com.onevictoria.mahjong.repo.*;
import com.onevictoria.mahjong.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ApiController {
    private static final String SCHEMA = "ov-mj-session/v1";
    private static final int MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
    private final AuthService auth;
    private final PlayerProfileRepository players;
    private final GameSessionRepository sessions;
    private final ObjectMapper json;

    public ApiController(AuthService auth, PlayerProfileRepository players, GameSessionRepository sessions, ObjectMapper json) {
        this.auth = auth; this.players = players; this.sessions = sessions; this.json = json;
    }

    @GetMapping("/health") public Map<String, Object> health() { return Map.of("status", "ok", "time", Instant.now().toString()); }

    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public AuthService.LoginResult register(@Valid @RequestBody AuthRequest request) { return auth.register(request.email(), request.password(), request.displayName()); }

    @PostMapping("/auth/login")
    public AuthService.LoginResult login(@Valid @RequestBody LoginRequest request) { return auth.login(request.email(), request.password()); }

    @PostMapping("/auth/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) { auth.revoke(authorization.substring(7).trim()); }

    @GetMapping("/me")
    public AccountView me(@RequestAttribute String accountId) {
        Account account = auth.requireAccount(accountId);
        return new AccountView(account.id, account.email, account.displayName, account.createdAt);
    }

    @GetMapping("/players")
    public List<PlayerView> listPlayers(@RequestAttribute String accountId) { return players.findByAccountIdOrderByCreatedAt(accountId).stream().map(PlayerView::from).toList(); }

    @PostMapping("/players") @ResponseStatus(HttpStatus.CREATED)
    public PlayerView createPlayer(@RequestAttribute String accountId, @Valid @RequestBody PlayerRequest request) {
        return PlayerView.from(players.save(new PlayerProfile(UUID.randomUUID().toString(), accountId, request.name().trim(), normalizeColor(request.color()), Instant.now())));
    }

    @PutMapping("/players/{id}")
    public PlayerView updatePlayer(@RequestAttribute String accountId, @PathVariable String id, @Valid @RequestBody PlayerRequest request) {
        PlayerProfile player = players.findByIdAndAccountId(id, accountId).orElseThrow(() -> ApiProblem.notFound("找不到玩家檔案"));
        player.name = request.name().trim(); player.color = normalizeColor(request.color());
        return PlayerView.from(players.save(player));
    }

    @DeleteMapping("/players/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlayer(@RequestAttribute String accountId, @PathVariable String id) {
        PlayerProfile player = players.findByIdAndAccountId(id, accountId).orElseThrow(() -> ApiProblem.notFound("找不到玩家檔案"));
        players.delete(player);
    }

    @GetMapping("/sessions")
    public List<SessionSummary> listSessions(@RequestAttribute String accountId) { return sessions.findByAccountIdOrderByUpdatedAtDesc(accountId).stream().map(SessionSummary::from).toList(); }

    @GetMapping("/sessions/{id}")
    public SessionView getSession(@RequestAttribute String accountId, @PathVariable String id) { return view(requireSession(accountId, id)); }

    @PutMapping("/sessions/{id}")
    @Transactional
    public SessionView putSession(@RequestAttribute String accountId, @PathVariable String id, @Valid @RequestBody SessionRequest request) {
        validatePayload(id, request.payload());
        String payload = writeJson(request.payload());
        GameSession entity = sessions.findById(id).orElse(null);
        Instant now = Instant.now();
        if (entity != null && !entity.accountId.equals(accountId)) throw ApiProblem.notFound("找不到牌局");
        if (entity == null) {
            if (request.expectedVersion() != null) throw ApiProblem.conflict("牌局版本已變更，請重新載入");
            entity = new GameSession(id, accountId, request.title().trim(), SCHEMA, payload, now);
        } else {
            if (request.expectedVersion() == null || !request.expectedVersion().equals(entity.version)) throw ApiProblem.conflict("牌局版本已變更，請重新載入");
            entity.title = request.title().trim(); entity.payload = payload; entity.updatedAt = now;
        }
        return view(sessions.saveAndFlush(entity));
    }

    @DeleteMapping("/sessions/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteSession(@RequestAttribute String accountId, @PathVariable String id, @RequestParam Long expectedVersion) {
        GameSession entity = requireSession(accountId, id);
        if (!expectedVersion.equals(entity.version)) throw ApiProblem.conflict("牌局版本已變更，請重新載入");
        sessions.delete(entity);
        sessions.flush();
    }

    @GetMapping(value = "/sessions/{id}/export.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JsonNode> exportJson(@RequestAttribute String accountId, @PathVariable String id) {
        GameSession entity = requireSession(accountId, id);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFilename(entity.title) + ".json\"").body(readJson(entity.payload));
    }

    @GetMapping(value = "/sessions/{id}/export.txt", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<byte[]> exportText(@RequestAttribute String accountId, @PathVariable String id) {
        GameSession entity = requireSession(accountId, id);
        JsonNode payload = readJson(entity.payload);
        StringBuilder text = new StringBuilder();
        text.append(entity.title).append("\r\n").append("Schema: ").append(entity.schemaVersion).append("\r\n");
        text.append("更新：").append(entity.updatedAt).append("\r\n");
        text.append("玩家：");
        if (payload.path("players").isArray()) {
            List<String> names = new ArrayList<>(); payload.path("players").forEach(player -> names.add(player.path("name").asText("未命名")));
            text.append(String.join("、", names));
        }
        text.append("\r\n紀錄數：").append(payload.path("entries").size()).append("\r\n\r\n完整牌局 JSON\r\n");
        try { text.append(json.writerWithDefaultPrettyPrinter().writeValueAsString(payload)); } catch (JsonProcessingException error) { throw new IllegalStateException(error); }
        byte[] bytes = ("\uFEFF" + text + "\r\n").getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFilename(entity.title) + ".txt\"").body(bytes);
    }

    private GameSession requireSession(String accountId, String id) { return sessions.findByIdAndAccountId(id, accountId).orElseThrow(() -> ApiProblem.notFound("找不到牌局")); }
    private void validatePayload(String id, JsonNode payload) {
        if (payload == null || !payload.isObject()) throw ApiProblem.badRequest("payload 必須是 JSON 物件");
        if (!SCHEMA.equals(payload.path("schemaVersion").asText())) throw ApiProblem.badRequest("只支援 " + SCHEMA);
        JsonNode playerNodes = payload.path("players");
        if (!playerNodes.isArray() || playerNodes.size() != 4) throw ApiProblem.badRequest("牌局必須正好有四位玩家");
        Set<String> playerIds = new HashSet<>();
        for (JsonNode player : playerNodes) {
            String playerId = player.path("id").asText("");
            String playerName = player.path("name").asText("");
            if (playerId.isBlank() || !playerIds.add(playerId)) throw ApiProblem.badRequest("玩家 ID 不可空白或重複");
            if (playerName.isBlank() || playerName.length() > 20) throw ApiProblem.badRequest("玩家名稱無效");
            requireInteger(player, "initialScore", -99999999, 99999999);
        }
        if (!playerIds.contains(payload.path("initialDealerId").asText())) throw ApiProblem.badRequest("起始莊家無效");
        JsonNode config = payload.path("config");
        if (!config.isObject()) throw ApiProblem.badRequest("config 必須是物件");
        requireInteger(config, "baseAmount", 0, 999999);
        requireInteger(config, "taiValue", 1, 999999);
        requireInteger(config, "dealerBaseTai", 0, 99);
        requireInteger(config, "streakTai", 0, 99);
        requireInteger(config, "pullTai", 0, 99);
        if (!config.path("drawContinues").isBoolean() || !config.path("drawAddsPull").isBoolean()) throw ApiProblem.badRequest("流局設定無效");
        String currency = config.path("currency").asText("");
        if (currency.isBlank() || currency.length() > 4) throw ApiProblem.badRequest("金額符號無效");
        JsonNode entryNodes = payload.path("entries");
        if (!entryNodes.isArray() || entryNodes.size() > 5000) throw ApiProblem.badRequest("entries 必須是陣列且不可超過 5000 筆");
        Set<String> entryIds = new HashSet<>();
        Set<String> types = Set.of("discard", "selfDraw", "multiWin", "draw", "adjustment", "breakPull");
        for (JsonNode entry : entryNodes) {
            String entryId = entry.path("id").asText("");
            String type = entry.path("type").asText("");
            if (entryId.isBlank() || !entryIds.add(entryId)) throw ApiProblem.badRequest("紀錄 ID 不可空白或重複");
            if (!types.contains(type)) throw ApiProblem.badRequest("紀錄類型無效");
            if (!entry.path("note").isTextual() || entry.path("note").asText().length() > 120) throw ApiProblem.badRequest("紀錄備註無效");
            if (Set.of("discard", "selfDraw", "multiWin", "draw").contains(type)) validateHandEntry(entry, type, playerIds);
            if (type.equals("adjustment")) {
                String payer = entry.path("payerId").asText(""); String receiver = entry.path("receiverId").asText("");
                long amount = entry.path("amount").asLong(0);
                if (!playerIds.contains(payer) || !playerIds.contains(receiver) || payer.equals(receiver) || amount < 1 || amount > 99999999) throw ApiProblem.badRequest("賞罰資料無效");
            }
        }
        String payloadId = payload.path("id").asText("");
        if (payloadId.isBlank() || !id.equals(payloadId)) throw ApiProblem.badRequest("URL 與 payload 牌局 ID 不一致");
        if (writeJson(payload).getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) throw ApiProblem.badRequest("牌局資料不可超過 2 MB");
    }
    private void validateHandEntry(JsonNode entry, String type, Set<String> playerIds) {
        JsonNode winners = entry.path("winnerIds");
        int winnerCount = winners.isArray() ? winners.size() : 0;
        Set<String> winnerIds = new HashSet<>();
        if (winners.isArray()) for (JsonNode winner : winners) {
            String winnerId = winner.asText("");
            if (!playerIds.contains(winnerId) || !winnerIds.add(winnerId)) throw ApiProblem.badRequest("贏家資料無效");
        }
        if ((type.equals("discard") || type.equals("selfDraw")) && winnerCount != 1) throw ApiProblem.badRequest("胡牌或自摸必須有一位贏家");
        if (type.equals("multiWin") && winnerCount < 2) throw ApiProblem.badRequest("一炮多響至少有兩位贏家");
        if (type.equals("discard") || type.equals("multiWin")) {
            String discarder = entry.path("discarderId").asText("");
            if (!playerIds.contains(discarder) || winnerIds.contains(discarder)) throw ApiProblem.badRequest("放槍者資料無效");
        }
        if (type.equals("selfDraw")) {
            String bao = entry.path("baoPlayerId").asText("");
            if (!bao.isEmpty() && (!playerIds.contains(bao) || winnerIds.contains(bao))) throw ApiProblem.badRequest("包自摸玩家無效");
        }
        String dealerAction = entry.path("dealerAction").asText("");
        if (!Set.of("auto", "continue", "rotate").contains(dealerAction)) throw ApiProblem.badRequest("莊家操作無效");
        int tai = requireInteger(entry, "tai", 0, 999);
        int multiplier = requireInteger(entry, "multiplier", 1, 3);
    }
    private int requireInteger(JsonNode parent, String field, int min, int max) {
        JsonNode value = parent.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt()) throw ApiProblem.badRequest(field + " 必須是整數");
        int number = value.asInt();
        if (number < min || number > max) throw ApiProblem.badRequest(field + " 超出範圍");
        return number;
    }
    private String normalizeColor(String value) {
        String color = value == null ? "#236b5e" : value.trim();
        if (!color.matches("^#[0-9a-fA-F]{6}$")) throw ApiProblem.badRequest("顏色必須是 #RRGGBB");
        return color.toLowerCase(Locale.ROOT);
    }
    private String writeJson(JsonNode value) { try { return json.writeValueAsString(value); } catch (JsonProcessingException error) { throw ApiProblem.badRequest("JSON 無法序列化"); } }
    private JsonNode readJson(String value) { try { return json.readTree(value); } catch (JsonProcessingException error) { throw new IllegalStateException(error); } }
    private SessionView view(GameSession entity) { return new SessionView(entity.id, entity.title, entity.schemaVersion, entity.version, entity.createdAt, entity.updatedAt, readJson(entity.payload)); }
    private String safeFilename(String value) { return value.replaceAll("[<>:\"/\\\\|?*\\x00-\\x1F]", "-").substring(0, Math.min(value.length(), 60)); }

    public record AuthRequest(@NotBlank @Email String email, @NotBlank @Size(min=8,max=72) String password, @NotBlank @Size(max=40) String displayName) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record AccountView(String id, String email, String displayName, Instant createdAt) {}
    public record PlayerRequest(@NotBlank @Size(max=40) String name, @Size(max=16) String color) {}
    public record PlayerView(String id, String name, String color, Instant createdAt) { static PlayerView from(PlayerProfile value) { return new PlayerView(value.id, value.name, value.color, value.createdAt); } }
    public record SessionRequest(@NotBlank @Size(max=80) String title, Long expectedVersion, @NotNull JsonNode payload) {}
    public record SessionSummary(String id, String title, String schemaVersion, Long version, Instant createdAt, Instant updatedAt) { static SessionSummary from(GameSession value) { return new SessionSummary(value.id, value.title, value.schemaVersion, value.version, value.createdAt, value.updatedAt); } }
    public record SessionView(String id, String title, String schemaVersion, Long version, Instant createdAt, Instant updatedAt, JsonNode payload) {}
}
