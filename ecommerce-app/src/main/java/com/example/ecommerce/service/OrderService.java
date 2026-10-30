package com.example.ecommerce.service;

import com.example.ecommerce.dto.OrderItemResponse;
import com.example.ecommerce.dto.OrderResponse;
import com.example.ecommerce.entity.CartItem;
import com.example.ecommerce.entity.Order;
import com.example.ecommerce.entity.OrderItem;
import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.exception.BadRequestException;
import com.example.ecommerce.exception.InsufficientStockException;
import com.example.ecommerce.exception.ResourceNotFoundException;
import com.example.ecommerce.repository.CartItemRepository;
import com.example.ecommerce.repository.OrderRepository;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    /*
     * Everything inside this method succeeds together or fails together.
     * If any RuntimeException is thrown (for example InsufficientStockException),
     * Spring ROLLS BACK all database changes made in this method.
     */
    @Transactional
    public OrderResponse placeOrder(String email) {
        User user = getUser(email);

        // 1. Load cart
        List<CartItem> cartItems = cartItemRepository.findByUser(user);
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Cart is empty");
        }

        Order order = new Order();
        order.setUser(user);
        order.setOrderDate(LocalDateTime.now());

        BigDecimal total = BigDecimal.ZERO;

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();

            // 2. Check product is active and stock is enough
            if (!product.isActive()) {
                throw new BadRequestException("Product '" + product.getName() + "' is no longer available");
            }
            if (product.getQuantity() < cartItem.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock for product '" + product.getName()
                        + "'. Available: " + product.getQuantity());
            }

            // 3. Create order item (price is saved at the time of purchase)
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPrice(product.getPrice());
            order.getItems().add(orderItem);

            // 4. Reduce inventory
            product.setQuantity(product.getQuantity() - cartItem.getQuantity());
            productRepository.save(product);

            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
        }

        order.setTotalAmount(total);

        // 5. Save order (order items are saved too because of cascade)
        Order savedOrder = orderRepository.save(order);

        // 6. Clear cart
        cartItemRepository.deleteAll(cartItems);

        return toResponse(savedOrder);
    }

    public List<OrderResponse> getMyOrders(String email) {
        User user = getUser(email);
        return orderRepository.findByUserOrderByOrderDateDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(i -> new OrderItemResponse(i.getProduct().getId(), i.getProduct().getName(),
                        i.getQuantity(), i.getPrice()))
                .toList();
        return new OrderResponse(order.getId(), order.getTotalAmount(), order.getOrderDate(), items);
    }
}
