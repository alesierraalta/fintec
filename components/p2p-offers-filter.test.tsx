import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import P2POffersFilter from "./p2p-offers-filter";
import { useBinanceP2POffers } from "@/hooks/use-binance-p2p-offers";

jest.mock("@/hooks/use-binance-p2p-offers");

const mockUseBinanceP2POffers = useBinanceP2POffers as jest.Mock;

describe("P2POffersFilter", () => {
  beforeEach(() => {
    mockUseBinanceP2POffers.mockReturnValue({
      status: "idle",
      result: null,
      error: null,
      retryAfterSeconds: null,
      loading: false,
      search: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders filter controls and the initial search guidance", () => {
    render(<P2POffersFilter />);
    expect(screen.getByText("Criterios de Búsqueda")).toBeTruthy();
    expect(screen.getByText("Comprar USDT")).toBeTruthy();
    expect(screen.getByText("Vender USDT")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej. 1000")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Buscar Ofertas/i }),
    ).toBeTruthy();
    expect(
      screen.getByText("Configura tus filtros para buscar ofertas P2P"),
    ).toBeTruthy();
  });

  it("updates state on user input", () => {
    render(<P2POffersFilter />);

    const amountInput = screen.getByPlaceholderText("Ej. 1000");
    fireEvent.change(amountInput, { target: { value: "500" } });
    expect(amountInput).toHaveValue(500);

    const sellBtn = screen.getByText("Vender USDT");
    fireEvent.click(sellBtn);
    expect(sellBtn).toHaveClass("bg-primary");
  });

  it("calls search with correct query on button click", () => {
    const mockSearch = jest.fn();
    mockUseBinanceP2POffers.mockReturnValue({
      status: "idle",
      result: null,
      error: null,
      retryAfterSeconds: null,
      loading: false,
      search: mockSearch,
    });

    render(<P2POffersFilter />);

    const amountInput = screen.getByPlaceholderText("Ej. 1000");
    fireEvent.change(amountInput, { target: { value: "500" } });

    fireEvent.click(screen.getByRole("button", { name: /Buscar Ofertas/i }));

    expect(mockSearch).toHaveBeenCalledWith({
      side: "BUY",
      amountMinor: 50000,
      paymentMethod: "ALL",
    });
  });

  it("renders loading state", () => {
    mockUseBinanceP2POffers.mockReturnValue({
      status: "loading",
      result: null,
      error: null,
      retryAfterSeconds: null,
      loading: true,
      search: jest.fn(),
    });

    render(<P2POffersFilter />);
    expect(screen.getByText("Obteniendo ofertas de Binance...")).toBeTruthy();
    expect(screen.getByText("Buscando...")).toBeTruthy();
  });

  it("renders error state", () => {
    mockUseBinanceP2POffers.mockReturnValue({
      status: "error",
      result: null,
      error: "Rate limit exceeded",
      retryAfterSeconds: 30,
      loading: false,
      search: jest.fn(),
    });

    render(<P2POffersFilter />);
    expect(screen.getByText("Rate limit exceeded")).toBeTruthy();
    expect(screen.getByText(/Por favor, espera 30 segundos/i)).toBeTruthy();
  });

  it("renders empty state", () => {
    mockUseBinanceP2POffers.mockReturnValue({
      status: "empty",
      result: null,
      error: null,
      retryAfterSeconds: null,
      loading: false,
      search: jest.fn(),
    });

    render(<P2POffersFilter />);
    expect(screen.getByText("No se encontraron ofertas")).toBeTruthy();
  });

  it("renders offers successfully", () => {
    const mockResult = {
      timestamp: Date.now(),
      offers: [
        {
          id: "offer1",
          merchant: {
            nickname: "CryptoTrader",
            monthOrderCount: 150,
            monthCompletionRateBps: 9850,
          },
          paymentMethods: [{ identifier: "Mercantil", name: "Mercantil" }],
          minFiatMinor: 100000,
          maxFiatMinor: 5000000,
          availableQuantity: { value: 500, asset: "USDT" },
          priceMinor: 405000,
        },
      ],
    };

    mockUseBinanceP2POffers.mockReturnValue({
      status: "live",
      result: mockResult,
      error: null,
      retryAfterSeconds: null,
      loading: false,
      search: jest.fn(),
    });

    render(<P2POffersFilter />);

    expect(screen.getByText("CryptoTrader")).toBeTruthy();
    expect(screen.getAllByText("Mercantil").length).toBeGreaterThan(0);
  });
});
