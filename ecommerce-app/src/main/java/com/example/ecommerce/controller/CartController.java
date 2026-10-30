package com.example.ecommerce.controller;

import com.example.ecommerce.dto.CartItemResponse;
import com.example.ecommerce.dto.CartRequest;
import com.example.ecommerce.dto.UpdateCartRequest;
import com.example.ecommerce.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class CartController {

    private final CartService cartService;

    // authentication.getName() returns the logged-in user's email (taken from the JWT)

    @GetMapping
    public ResponseEntity<List<CartItemResponse>> viewCart(Authentication authentication) {
        return ResponseEntity.ok(cartService.viewCart(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<CartItemResponse> addToCart(Authentication authentication,
                                                      @Valid @RequestBody CartRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cartService.addToCart(authentication.getName(), request));
    }

    @PutMapping("/{cartItemId}")
    public ResponseEntity<CartItemResponse> updateCartItem(Authentication authentication,
                                                           @PathVariable Long cartItemId,
                                                           @Valid @RequestBody UpdateCartRequest request) {
        return ResponseEntity.ok(cartService.updateCartItem(authentication.getName(), cartItemId, request));
    }

    @DeleteMapping("/{cartItemId}")
    public ResponseEntity<String> removeCartItem(Authentication authentication,
                                                 @PathVariable Long cartItemId) {
        return ResponseEntity.ok(cartService.removeCartItem(authentication.getName(), cartItemId));
    }
}
