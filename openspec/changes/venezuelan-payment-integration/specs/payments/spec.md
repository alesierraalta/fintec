# Payments Specification

## Purpose

Define the behavior for managing payment orders, specifically for users in Venezuela. This domain handles the lifecycle of creating an order, delivering payment instructions for different providers (Ubii, PagoFlash, Binance Pay), and collecting evidence of payment for review.

## Requirements

### Requirement: Payment Method Selection

The system MUST allow users to select an explicit payment method during order creation. This method determines the instruction flow and credentials delivered to the user.

#### Scenario: Create order with specific payment method
- GIVEN a user is creating a new payment order
- WHEN the user selects "Binance Pay" and submits the form
- THEN the system persists the order with `payment_method = 'BINANCE_PAY'`
- AND the user is navigated to the instructions for that specific method

#### Scenario: Order creation without method selection
- GIVEN a user is creating a new payment order
- WHEN no payment method is selected
- THEN the system MUST reject the creation with a validation error

### Requirement: Dynamic Instruction Set

The system SHALL provide specific instructions, steps, and credentials (links, IDs, QR codes) based on the `payment_method` set on the order.

#### Scenario: Display Ubii instructions
- GIVEN a payment order with `payment_method = 'UBII'`
- WHEN the user views the instructions page
- THEN the system MUST show the "Ubii Link" and steps to pay as a professional
- AND MUST NOT show Mercantil Banco or Binance details

#### Scenario: Display Binance Pay instructions
- GIVEN a payment order with `payment_method = 'BINANCE_PAY'`
- WHEN the user views the instructions page
- THEN the system MUST show the Binance ID and the payment QR code
- AND SHOULD show the estimated amount in USDT if relevant

#### Scenario: Display PagoFlash instructions
- GIVEN a payment order with `payment_method = 'PAGO_FLASH'`
- WHEN the user views the instructions page
- THEN the system MUST show a "Pay now with PagoFlash" integration or button

### Requirement: Legacy Support (Default Method)

Orders created before the implementation of the `payment_method` field MUST be handled gracefully, defaulting to the original manual bank transfer instructions.

#### Scenario: Handling legacy order without method
- GIVEN an existing payment order with `payment_method = NULL`
- WHEN the instructions page is rendered
- THEN the system SHOULD default to showing the original "Mercantil Banco" instructions
- AND the UI SHOULD remain functional for receipt upload

### Requirement: Receipt Upload remains Mandatory

Regardless of the payment method, the system MUST require the user to upload a proof of payment (receipt) to transition the order to `pending_review`.

#### Scenario: Transition to review after payment
- GIVEN a payment order in `pending` status for any method
- WHEN the user successfully uploads a receipt image/document
- THEN the order status MUST change to `pending_review`
- AND the admin MUST be able to see which method was used to pay
