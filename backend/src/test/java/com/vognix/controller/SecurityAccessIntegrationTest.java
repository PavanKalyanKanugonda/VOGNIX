package com.vognix.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Public catalog endpoints should be accessible without credentials")
    void testPublicCatalogAccess() throws Exception {
        mockMvc.perform(get("/api/products")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/categories")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Protected customer endpoints should reject unauthenticated requests with 401")
    void testProtectedCartEndpointRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/cart")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "customer@vognix.com", authorities = {"ROLE_CUSTOMER"})
    @DisplayName("Customer role should be forbidden (403) from accessing admin endpoints")
    void testCustomerCannotAccessAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@vognix.com", authorities = {"ROLE_ADMIN"})
    @DisplayName("Administrator role should be authorized to access admin endpoints")
    void testAdminCanAccessAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
