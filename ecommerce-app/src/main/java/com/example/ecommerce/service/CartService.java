package com.example.ecommerce.service;

import com.example.ecommerce.dto.CartItemResponse;
import com.example.ecommerce.dto.CartRequest;
import com.example.ecommerce.dto.UpdateCartRequest;
import com.example.ecommerce.entity.CartItem;
import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.exception.BadRequestException;
import com.example.ecommerce.exception.ResourceNotFoundException;
import com.example.ecommerce.repository.CartItemRepository;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartItemResponse addToCart(String email, CartRequest request) {
        User user = getUser(email);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + request.getProductId()));

        if (!product.isActive()) {
            throw new BadRequestException("Product is not available");
        }

        // If the product is already in the cart, increase the quantity
        CartItem item = cartItemRepository.findByUserAndProduct(user, product).orElse(null);
        if (item == null) {
            item = new CartItem();
            item.setUser(user);
            item.setProduct(product);
            item.setQuantity(request.getQuantity());
        } else {
            item.setQuantity(item.getQuantity() + request.getQuantity());
        }

        return toResponse(cartItemRepository.save(item));
    }

    public CartItemResponse updateCartItem(String email, Long cartItemId, UpdateCartRequest request) {
        CartItem item = getUserCartItem(email, cartItemId);
        item.setQuantity(request.getQuantity());
        return toResponse(cartItemRepository.save(item));
    }

    public String removeCartItem(String email, Long cartItemId) {
        CartItem item = getUserCartItem(email, cartItemId);
        cartItemRepository.delete(item);
        return "Item removed from cart";
    }

    public List<CartItemResponse> viewCart(String email) {
        User user = getUser(email);
        return cartItemRepository.findByUser(user).stream()
                .map(this::toResponse)
                .toList();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    // Makes sure a user can only touch his own cart items
    private CartItem getUserCartItem(String email, Long cartItemId) {
        User user = getUser(email);
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id " + cartItemId));

        if (!item.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Cart item not found with id " + cartItemId);
        }
        return item;
    }

    private CartItemResponse toResponse(CartItem item) {
        Product p = item.getProduct();
        return new CartItemResponse(item.getId(), p.getId(), p.getName(), p.getPrice(), item.getQuantity());
    }
}
