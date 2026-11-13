import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { ThemeProvider } from "@/hooks/useTheme";
import {
  brandPricesFixture,
  chartsFixture,
  fuelFixture,
  healthFixture,
  makeList,
  makeRecord,
  modelInfoFixture,
  optionsFixture,
  overviewFixture,
  priceDistFixture,
  statsFixture,
  usageFixture,
  yearFixture,
} from "@/test/fixtures";
import { installFetch, type Routes } from "@/test/mockFetch";

const baseRoutes: Routes = {
  "GET /api/health": { body: healthFixture },
  "GET /api/dashboard/stats": { body: statsFixture },
  "GET /api/dashboard/charts": { body: chartsFixture },
  "GET /api/analytics/overview": { body: overviewFixture },
  "GET /api/analytics/brand-prices": { body: brandPricesFixture },
  "GET /api/analytics/fuel-analysis": { body: fuelFixture },
  "GET /api/analytics/year-analysis": { body: yearFixture },
  "GET /api/analytics/price-distribution": { body: priceDistFixture },
  "GET /api/analytics/usage-analysis": { body: usageFixture },
  "GET /api/meta/options": { body: optionsFixture },
  "GET /api/predictions/fuel-options": { body: ["Diesel", "Petrol"] },
  "GET /api/predictions": { body: makeList([makeRecord()]) },
  "GET /api/model/info": { body: modelInfoFixture },
};

function renderApp(initialPath = "/") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("pages load", () => {
  it("Dashboard shows KPIs and charts from the API", async () => {
    installFetch(baseRoutes);
    renderApp("/");

    expect(
      await screen.findByText("Total Predictions", undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Real fixture values, Indian formatting.
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(await screen.findByText("₹6,05,012")).toBeInTheDocument();

    expect(
      await screen.findByText("Predicted Price Distribution"),
    ).toBeInTheDocument();
    expect(screen.getByText("Car Brand Price Comparison")).toBeInTheDocument();

    // Recharts actually painted into the chart boxes.
    await waitFor(
      () => {
        expect(
          document.querySelectorAll(".recharts-wrapper").length,
        ).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  });

  it("Predict Price renders the form with model-backed options", async () => {
    installFetch(baseRoutes);
    renderApp("/predict");

    expect(
      await screen.findByLabelText("Car price prediction form"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Load Sample Data")).toBeInTheDocument();
    // Options came from /api/meta/options, not hardcoded lists.
    expect(await screen.findByText("Manufacturing Year")).toBeInTheDocument();
  });

  it("Prediction History renders the records table", async () => {
    installFetch(baseRoutes);
    renderApp("/history");

    expect(
      await screen.findByText("Maruti Swift Dzire VDI", undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by car name, ID, fuel…"),
    ).toBeInTheDocument();
    expect(screen.getByText("Clear history")).toBeInTheDocument();
  });

  it("Analytics renders dataset insights", async () => {
    installFetch(baseRoutes);
    renderApp("/analytics");

    expect(
      await screen.findByRole("heading", { level: 2, name: "Analytics" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Average Price")).toBeInTheDocument();
    expect(
      await screen.findByText("Brand Price Comparison"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("How these numbers are calculated"),
    ).toBeInTheDocument();
  });

  it("About & Model renders notebook metrics", async () => {
    installFetch(baseRoutes);
    renderApp("/about");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Model Information",
      }),
    ).toBeInTheDocument();
    // Best-model card + metrics table both name the winner.
    expect(
      await screen.findAllByText("Linear Regression"),
    ).not.toHaveLength(0);
    expect(await screen.findByText("Model Performance Metrics")).toBeInTheDocument();
    // MAE from the notebook artifact, not invented.
    expect(await screen.findByText("₹95,267")).toBeInTheDocument();
  });

  it("unknown routes show the 404 page", async () => {
    installFetch(baseRoutes);
    renderApp("/does-not-exist");

    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("moves between all five pages via the sidebar", async () => {
    const user = userEvent.setup();
    installFetch(baseRoutes);
    renderApp("/");

    await screen.findByText("Total Predictions");

    await user.click(screen.getByRole("link", { name: "Predict Price" }));
    expect(await screen.findByLabelText("Car price prediction form")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Prediction History" }));
    expect(await screen.findByText("Clear history")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Analytics" }));
    expect(await screen.findByText("How these numbers are calculated")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "About & Model" }));
    expect(await screen.findByText("Model Performance Metrics")).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "Dashboard" })[0]);
    expect(await screen.findByText("Total Predictions")).toBeInTheDocument();
  });
});

describe("theme switching", () => {
  it("toggles dark mode on the document and persists it", async () => {
    const user = userEvent.setup();
    installFetch(baseRoutes);
    renderApp("/");

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("smartcar-theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("smartcar-theme")).toBe("light");
  });

  it("starts in dark mode when it was previously chosen", async () => {
    window.localStorage.setItem("smartcar-theme", "dark");
    installFetch(baseRoutes);
    renderApp("/");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeInTheDocument();
  });
});
