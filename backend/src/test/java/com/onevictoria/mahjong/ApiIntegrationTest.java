package com.onevictoria.mahjong;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String register(String email) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"StrongPass123\",\"displayName\":\"Tester\"}";
        MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).path("token").asText();
    }
    private String sessionPayload(String id) {
        return "{\"title\":\"Friday Game\",\"payload\":{\"schemaVersion\":\"ov-mj-session/v1\",\"id\":\"" + id + "\",\"title\":\"Friday Game\",\"createdAt\":\"2026-01-01T00:00:00Z\",\"updatedAt\":\"2026-01-01T00:00:00Z\",\"initialDealerId\":\"p1\",\"players\":[{\"id\":\"p1\",\"name\":\"A\",\"initialScore\":0},{\"id\":\"p2\",\"name\":\"B\",\"initialScore\":0},{\"id\":\"p3\",\"name\":\"C\",\"initialScore\":0},{\"id\":\"p4\",\"name\":\"D\",\"initialScore\":0}],\"config\":{\"baseAmount\":30,\"taiValue\":10,\"currency\":\"$\",\"dealerBaseTai\":1,\"streakTai\":1,\"pullTai\":1,\"drawContinues\":true,\"drawAddsPull\":true},\"entries\":[]}}";
    }

    @Test void healthIsPublicAndProtectedRoutesRequireToken() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok"));
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test void registerLoginAndProfileCrudWork() throws Exception {
        String token = register("profile@example.com");
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("profile@example.com"));
        mvc.perform(post("/api/players").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Alice\",\"color\":\"#123456\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Alice"));
        mvc.perform(get("/api/players").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Alice"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"profile@example.com\",\"password\":\"StrongPass123\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test void sessionCrudExportsValidationAndOwnershipWork() throws Exception {
        String owner = register("owner@example.com");
        String other = register("other@example.com");
        String id = "session-1";
        mvc.perform(put("/api/sessions/{id}", id).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(sessionPayload(id)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.payload.schemaVersion").value("ov-mj-session/v1"));
        mvc.perform(get("/api/sessions/{id}", id).header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
        mvc.perform(put("/api/sessions/{id}", id).header("Authorization", "Bearer " + other).contentType(MediaType.APPLICATION_JSON).content(sessionPayload(id)))
            .andExpect(status().isNotFound());
        mvc.perform(put("/api/sessions/{id}", id).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(sessionPayload(id).replace("\"payload\"", "\"expectedVersion\":99,\"payload\"")))
            .andExpect(status().isConflict());
        mvc.perform(put("/api/sessions/{id}", id).header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(sessionPayload(id).replace("\"payload\"", "\"expectedVersion\":0,\"payload\"")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
        mvc.perform(get("/api/sessions/{id}/export.json", id).header("Authorization", "Bearer " + owner)).andExpect(status().isOk()).andExpect(jsonPath("$.players.length()").value(4));
        mvc.perform(get("/api/sessions/{id}/export.txt", id).header("Authorization", "Bearer " + owner)).andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.containsString("完整牌局 JSON")));
        mvc.perform(put("/api/sessions/bad").header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Bad\",\"payload\":{\"schemaVersion\":\"wrong\",\"players\":[],\"entries\":[]}}"))
            .andExpect(status().isBadRequest());
        String invalidBao = sessionPayload("bao-invalid").replace("\"entries\":[]", "\"entries\":[{\"id\":\"e1\",\"type\":\"selfDraw\",\"note\":\"\",\"winnerIds\":[\"p1\"],\"discarderId\":\"\",\"tai\":5,\"multiplier\":1,\"baoPlayerId\":\"p1\",\"dealerAction\":\"auto\",\"breakPullAfter\":false}]");
        mvc.perform(put("/api/sessions/bao-invalid").header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(invalidBao))
            .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/sessions/{id}", id).queryParam("expectedVersion", "0").header("Authorization", "Bearer " + owner)).andExpect(status().isConflict());
        mvc.perform(delete("/api/sessions/{id}", id).queryParam("expectedVersion", "1").header("Authorization", "Bearer " + owner)).andExpect(status().isNoContent());
    }
}
