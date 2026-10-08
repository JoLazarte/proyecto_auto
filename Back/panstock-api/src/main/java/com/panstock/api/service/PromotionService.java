package com.panstock.api.service;

import com.panstock.api.dto.request.PromotionRequest;
import com.panstock.api.dto.response.PromotionResponse;
import com.panstock.api.dto.response.PromotionSuggestionResponse;
import com.panstock.api.entity.User;

import java.util.List;

public interface PromotionService {

    List<PromotionSuggestionResponse> getSuggestions();

    PromotionResponse create(PromotionRequest request, User currentUser);

    List<PromotionResponse> findAll();

    List<PromotionResponse> findActive();

    PromotionResponse cancel(Long id);
}